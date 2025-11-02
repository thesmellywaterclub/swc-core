import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";
import jwt, { type SignOptions, type Secret } from "jsonwebtoken";

import { env } from "../../env";
import { createHttpError } from "../../middlewares/error";
import { prisma } from "../../prisma";
import { serializeUser, type CreateUserInput, type UserSummary } from "./users.service";
import { sendEmail } from "../../services/email/email.service";

const AUTH_USER_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  phone: true,
  fullName: true,
  avatarUrl: true,
  isSeller: true,
  clubMember: true,
  clubVerified: true,
  sellerId: true,
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
  sellerId: string | null;
};

export type AuthResponse = {
  token: string;
  user: UserSummary;
};

function signAccessToken(user: UserSummary): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    sellerId: user.sellerId,
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

const OTP_EXPIRY_MINUTES = 10;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestEmailOtp(email: string) {
  const existingUser = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });

  if (existingUser) {
    throw createHttpError(409, "An account with this email already exists");
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      email,
      consumedAt: null,
      expiresAt: { lt: new Date() },
    },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      email,
      codeHash: hashOtp(code),
      expiresAt,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(`[auth] Email OTP for ${email}: ${code}`);
  }

  await sendEmail({
    to: email,
    type: "emailVerificationOtp",
    data: {
      customerName: email.split("@")[0] ?? email,
      otpCode: code,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
      supportEmail: env.emailFrom,
    },
  });

  return {
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
  } as const;
}

async function verifyEmailOtp(email: string, code: string, tx: Prisma.TransactionClient) {
  const token = await tx.emailVerificationToken.findFirst({
    where: {
      email,
      consumedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!token) {
    throw createHttpError(400, "No OTP found for the provided email");
  }

  if (token.expiresAt < new Date()) {
    throw createHttpError(400, "OTP has expired. Please request a new one");
  }

  const expectedHash = hashOtp(code);
  const matches = token.codeHash === expectedHash;

  if (!matches) {
    throw createHttpError(400, "Invalid OTP code");
  }

  await tx.emailVerificationToken.update({
    where: { id: token.id },
    data: {
      consumedAt: new Date(),
    },
  });
}

export async function registerUser(input: CreateUserInput, otpCode: string): Promise<AuthResponse> {
  const user = await prisma.$transaction(async (tx) => {
    await verifyEmailOtp(input.email, otpCode, tx);
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
        sellerId:
          typeof (decoded as { sellerId?: unknown }).sellerId === "string"
            ? ((decoded as { sellerId: string }).sellerId || null)
            : null,
      };
    }
    throw new Error("Invalid token payload");
  } catch (error) {
    throw createHttpError(401, "Invalid or expired token", error instanceof Error ? { message: error.message } : undefined);
  }
}
