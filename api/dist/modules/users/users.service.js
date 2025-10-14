"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.getUserById = getUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../prisma");
const error_1 = require("../../middlewares/error");
const USER_SELECT = client_1.Prisma.validator()({
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
});
function serializeUser(user) {
    return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isSeller: user.isSeller,
        clubMember: user.clubMember,
        clubVerified: user.clubVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}
async function assertActiveUserOrThrow(id) {
    const user = await prisma_1.prisma.user.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
    });
    if (!user) {
        throw (0, error_1.createHttpError)(404, "User not found");
    }
    return user.id;
}
async function listUsers(options = {}) {
    const limit = options.limit ?? 20;
    const take = Math.min(Math.max(limit, 1), 50);
    const users = await prisma_1.prisma.user.findMany({
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
async function getUserById(id) {
    const user = await prisma_1.prisma.user.findFirst({
        where: { id, deletedAt: null },
        select: USER_SELECT,
    });
    if (!user) {
        throw (0, error_1.createHttpError)(404, "User not found");
    }
    return serializeUser(user);
}
async function createUser(input) {
    try {
        const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
        const user = await prisma_1.prisma.user.create({
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
            select: USER_SELECT,
        });
        return serializeUser(user);
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            throw (0, error_1.createHttpError)(409, "A user with the provided unique field already exists", { target: error.meta?.target });
        }
        throw error;
    }
}
async function updateUser(id, input) {
    await assertActiveUserOrThrow(id);
    const data = {};
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
    if (input.password) {
        data.passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    }
    try {
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data,
            select: USER_SELECT,
        });
        return serializeUser(user);
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            throw (0, error_1.createHttpError)(409, "A user with the provided unique field already exists", { target: error.meta?.target });
        }
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            throw (0, error_1.createHttpError)(404, "User not found");
        }
        throw error;
    }
}
async function deleteUser(id) {
    await assertActiveUserOrThrow(id);
    try {
        await prisma_1.prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            throw (0, error_1.createHttpError)(404, "User not found");
        }
        throw error;
    }
}
