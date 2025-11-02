import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../../prisma";
import { createHttpError } from "../../middlewares/error";

const USER_SELECT = Prisma.validator<Prisma.UserSelect>()({
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
});

type UserRecord = Prisma.UserGetPayload<{
  select: typeof USER_SELECT;
}>;

export type UserSummary = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  isSeller: boolean;
  clubMember: boolean;
  clubVerified: boolean;
  sellerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListUsersOptions = {
  limit?: number;
  cursor?: string;
};

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  isSeller?: boolean;
  clubMember?: boolean;
  clubVerified?: boolean;
  sellerId?: string | null;
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, "password">> & {
  password?: string;
};

export function serializeUser(user: UserRecord): UserSummary {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isSeller: user.isSeller,
    clubMember: user.clubMember,
    clubVerified: user.clubVerified,
    sellerId: user.sellerId ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function assertActiveUserOrThrow(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return user.id;
}

export async function listUsers(options: ListUsersOptions = {}) {
  const limit = options.limit ?? 20;
  const take = Math.min(Math.max(limit, 1), 50);

  const users = await prisma.user.findMany({
    select: USER_SELECT,
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: take + 1,
    ...(options.cursor
      ? {
          skip: 1,
          cursor: { id: options.cursor },
        }
      : {}),
  });

  const hasMore = users.length > take;
  const sliced = hasMore ? users.slice(0, take) : users;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : undefined;

  return {
    data: sliced.map(serializeUser),
    nextCursor,
  };
}

export async function getUserById(id: string): Promise<UserSummary> {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: USER_SELECT,
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return serializeUser(user);
}

export async function createUser(input: CreateUserInput): Promise<UserSummary> {
  try {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        avatarUrl: input.avatarUrl,
        isSeller: input.isSeller ?? false,
        clubMember: input.clubMember ?? false,
        clubVerified: input.clubVerified ?? false,
        ...(input.sellerId
          ? {
              seller: {
                connect: { id: input.sellerId },
              },
            }
          : {}),
      },
      select: USER_SELECT,
    });

    return serializeUser(user);
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
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<UserSummary> {
  await assertActiveUserOrThrow(id);

  const data: Prisma.UserUpdateInput = {};

  if (input.fullName !== undefined) {
    data.fullName = input.fullName;
  }
  if (input.email !== undefined) {
    data.email = input.email;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone || null;
  }
  if (input.avatarUrl !== undefined) {
    data.avatarUrl = input.avatarUrl || null;
  }
  if (input.isSeller !== undefined) {
    data.isSeller = input.isSeller;
  }
  if (input.clubMember !== undefined) {
    data.clubMember = input.clubMember;
  }
  if (input.clubVerified !== undefined) {
    data.clubVerified = input.clubVerified;
  }
  if (input.sellerId !== undefined) {
    if (input.sellerId) {
      data.seller = {
        connect: { id: input.sellerId },
      };
    } else {
      data.seller = {
        disconnect: true,
      };
    }
  }
  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 12);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    return serializeUser(user);
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw createHttpError(404, "User not found");
    }
    throw error;
  }
}

export async function deleteUser(id: string) {
  await assertActiveUserOrThrow(id);

  try {
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw createHttpError(404, "User not found");
    }
    throw error;
  }
}
