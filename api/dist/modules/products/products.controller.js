"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveProductHandler = exports.updateProductHandler = exports.createProductHandler = exports.getProductBySlugHandler = exports.getProductByIdHandler = exports.listProductsHandler = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const error_1 = require("../../middlewares/error");
const products_service_1 = require("./products.service");
const products_schemas_1 = require("./products.schemas");
exports.listProductsHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const filters = products_schemas_1.listProductsQuerySchema.parse(req.query);
    const result = await (0, products_service_1.listProducts)(filters);
    res.json({
        data: result.data,
        meta: {
            nextCursor: result.nextCursor ?? null,
        },
    });
});
exports.getProductByIdHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = products_schemas_1.productIdParamSchema.parse(req.params);
    const product = await (0, products_service_1.getProductById)(id);
    res.json({ data: product });
});
exports.getProductBySlugHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { slug } = products_schemas_1.productSlugParamSchema.parse(req.params);
    const product = await (0, products_service_1.getProductBySlug)(slug);
    if (!product) {
        throw (0, error_1.createHttpError)(404, "Product not found");
    }
    res.json({ data: product });
});
exports.createProductHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payload = products_schemas_1.createProductSchema.parse(req.body);
    const product = await (0, products_service_1.createProduct)(payload);
    res.status(201).json({ data: product });
});
exports.updateProductHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = products_schemas_1.productIdParamSchema.parse(req.params);
    const payload = products_schemas_1.updateProductSchema.parse(req.body);
    const product = await (0, products_service_1.updateProduct)(id, payload);
    res.json({ data: product });
});
exports.archiveProductHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = products_schemas_1.productIdParamSchema.parse(req.params);
    await (0, products_service_1.archiveProduct)(id);
    res.status(204).send();
});
