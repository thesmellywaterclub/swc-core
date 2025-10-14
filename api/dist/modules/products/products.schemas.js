"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = exports.listProductsQuerySchema = exports.productSlugParamSchema = exports.productIdParamSchema = void 0;
const zod_1 = require("zod");
const genderEnum = zod_1.z.enum(["unisex", "men", "women", "other"]);
const notesSchema = zod_1.z
    .object({
    top: zod_1.z.array(zod_1.z.string()).optional(),
    heart: zod_1.z.array(zod_1.z.string()).optional(),
    base: zod_1.z.array(zod_1.z.string()).optional(),
})
    .transform((value) => ({
    top: value.top ?? [],
    heart: value.heart ?? [],
    base: value.base ?? [],
}));
exports.productIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid({
        message: "Product id must be a valid UUID",
    }),
});
exports.productSlugParamSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1, "Slug is required"),
});
exports.listProductsQuerySchema = zod_1.z.object({
    cursor: zod_1.z
        .string()
        .uuid({ message: "Cursor must be a valid UUID" })
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
        .pipe(zod_1.z.number().int().min(1).max(50).optional()),
    gender: genderEnum.optional(),
    brandId: zod_1.z.string().uuid({ message: "brandId must be a valid UUID" }).optional(),
    isActive: zod_1.z
        .union([zod_1.z.string(), zod_1.z.boolean(), zod_1.z.undefined()])
        .transform((value) => {
        if (typeof value === "boolean") {
            return value;
        }
        if (typeof value === "string") {
            if (value.toLowerCase() === "true") {
                return true;
            }
            if (value.toLowerCase() === "false") {
                return false;
            }
        }
        return undefined;
    })
        .optional(),
    search: zod_1.z
        .string()
        .transform((value) => value.trim())
        .pipe(zod_1.z.string().min(1).max(120))
        .optional(),
});
exports.createProductSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    brandId: zod_1.z.string().uuid({ message: "brandId must be a valid UUID" }),
    gender: genderEnum,
    description: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    notes: notesSchema.optional(),
});
exports.updateProductSchema = exports.createProductSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, "At least one field must be provided to update the product");
