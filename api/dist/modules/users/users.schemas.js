"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = exports.listUsersQuerySchema = exports.userIdParamSchema = void 0;
const zod_1 = require("zod");
exports.userIdParamSchema = zod_1.z.object({
    id: zod_1.z.uuid({
        message: "User id must be a valid UUID",
    }),
});
exports.listUsersQuerySchema = zod_1.z.object({
    cursor: zod_1.z.uuid({ message: "Cursor must be a valid UUID" })
        .optional(),
    limit: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number(), zod_1.z.undefined()])
        .transform((value) => {
        if (typeof value === "number") {
            return value;
        }
        if (typeof value === "string" && value.trim().length > 0) {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
        return undefined;
    })
        .pipe(zod_1.z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()),
});
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(8),
    fullName: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(8).max(20).optional(),
    avatarUrl: zod_1.z.url().optional(),
    isSeller: zod_1.z.boolean().optional(),
    clubMember: zod_1.z.boolean().optional(),
    clubVerified: zod_1.z.boolean().optional(),
});
exports.updateUserSchema = exports.createUserSchema
    .omit({ password: true, email: true })
    .extend({
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(8).optional(),
    phone: exports.createUserSchema.shape.phone.optional(),
})
    .refine((value) => Object.keys(value).length > 0, "At least one field must be provided to update the user");
