import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions, type Secret } from "jsonwebtoken";

import { env } from "../../env";
import { createHttpError } from "../../middlewares/error";
import { prisma } from "../../prisma";
import { serializeUser, type CreateUserInput, type UserSummary } from "./users.service";

const AUTH_USER_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  phone: true,
  fullName: true,
  avatarUrl: true,
  isSeller: true,
  clubMember: true,
  clubVerified: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true,
});

type UserWithPassword = Prisma.UserGetPayload<{
  select: typeof AUTH_USER_SELECT;
}>;

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: UserSummary;
};

function signAccessToken(user: UserSummary): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
  };

  const secret: Secret = env.jwtSecret;
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as unknown as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, secret, options);
}

async function findActiveUserByEmail(email: string): Promise<UserWithPassword | null> {
  return prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
    select: AUTH_USER_SELECT,
  });
}

function stripPassword(user: UserWithPassword): {
  summary: UserSummary;
  passwordHash: string;
} {
  const { passwordHash, ...userWithoutPassword } = user;
  return {
    passwordHash,
    summary: serializeUser(userWithoutPassword),
  };
}

export async function registerUser(input: CreateUserInput): Promise<AuthResponse> {
  const user = await prisma.$transaction(async (tx) => {
    try {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone,
          avatarUrl: input.avatarUrl,
          isSeller: input.isSeller ?? false,
          clubMember: input.clubMember ?? false,
          clubVerified: input.clubVerified ?? false,
        },
        select: AUTH_USER_SELECT,
      });

      return created;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw createHttpError(
          409,
          "A user with the provided unique field already exists",
          { target: error.meta?.target }
        );
      }
      throw error;
    }
  });

  const { passwordHash: _password, summary } = stripPassword(user);
  const token = signAccessToken(summary);

  return { token, user: summary };
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const user = await findActiveUserByEmail(email);

  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw createHttpError(401, "Invalid credentials");
  }

  const { passwordHash: _hash, summary } = stripPassword(user);
  const token = signAccessToken(summary);
  return { token, user: summary };
}

export async function getAuthenticatedUser(userId: string): Promise<UserSummary> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: AUTH_USER_SELECT,
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  const { passwordHash: _hash, summary } = stripPassword(user);
  return summary;
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    const secret: Secret = env.jwtSecret;
    const decoded = jwt.verify(token, secret);
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof decoded.sub === "string" &&
      typeof decoded.email === "string"
    ) {
      return {
        sub: decoded.sub,
        email: decoded.email,
      };
    }
    throw new Error("Invalid token payload");
  } catch (error) {
    throw createHttpError(401, "Invalid or expired token", error instanceof Error ? { message: error.message } : undefined);
  }
}
