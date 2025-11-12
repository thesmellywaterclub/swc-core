import { z } from "zod";

const genderEnum = z.enum(["unisex", "men", "women", "other"]);

const notesSchema = z
  .object({
    top: z.array(z.string()).optional(),
    heart: z.array(z.string()).optional(),
    base: z.array(z.string()).optional(),
  })
  .transform((value) => ({
    top: value.top ?? [],
    heart: value.heart ?? [],
    base: value.base ?? [],
  }));

export const productIdParamSchema = z.object({
  id: z.string().uuid({
    message: "Product id must be a valid UUID",
  }),
});

export const productSlugParamSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
});

export const listProductsQuerySchema = z.object({
  cursor: z
    .string()
    .uuid({ message: "Cursor must be a valid UUID" })
    .optional(),
  limit: z
    .union([z.string(), z.number(), z.undefined()])
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
    .pipe(z.number().int().min(1).max(200).optional()),
  gender: genderEnum.optional(),
  brandId: z.string().uuid({ message: "brandId must be a valid UUID" }).optional(),
  isActive: z
    .union([z.string(), z.boolean(), z.undefined()])
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
  search: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1).max(120))
    .optional(),
});

export const createProductSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  brandId: z.string().uuid({ message: "brandId must be a valid UUID" }),
  gender: genderEnum,
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: notesSchema.optional(),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided to update the product"
  );

export const productMediaPresignBodySchema = z.object({
  contentType: z
    .string()
    .min(1, "contentType is required"),
  fileName: z.string().optional(),
});

export const productMediaCreateSchema = z.object({
  url: z.string().url("url must be a valid URL"),
  alt: z.string().max(200).optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const productMediaUpdateSchema = z
  .object({
    alt: z.string().max(200).optional(),
    isPrimary: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided to update the media item"
  );

export const productMediaIdParamSchema = z.object({
  mediaId: z.string().uuid({
    message: "Media id must be a valid UUID",
  }),
});

export const productVariantCreateSchema = z.object({
  sizeMl: z.number().int().positive(),
  sku: z.string().min(1).max(120),
  mrpPaise: z.number().int().positive(),
  salePaise: z
    .number()
    .int()
    .positive()
    .optional(),
});
