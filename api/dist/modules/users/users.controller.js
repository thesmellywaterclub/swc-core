"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserHandler = exports.updateUserHandler = exports.createUserHandler = exports.getUserByIdHandler = exports.listUsersHandler = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const users_service_1 = require("./users.service");
const users_schemas_1 = require("./users.schemas");
exports.listUsersHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit, cursor } = users_schemas_1.listUsersQuerySchema.parse(req.query);
    const result = await (0, users_service_1.listUsers)({ limit, cursor });
    res.json({
        data: result.data,
        meta: {
            nextCursor: result.nextCursor ?? null,
        },
    });
});
exports.getUserByIdHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = users_schemas_1.userIdParamSchema.parse(req.params);
    const user = await (0, users_service_1.getUserById)(id);
    res.json({ data: user });
});
exports.createUserHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payload = users_schemas_1.createUserSchema.parse(req.body);
    const user = await (0, users_service_1.createUser)(payload);
    res.status(201).json({ data: user });
});
exports.updateUserHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = users_schemas_1.userIdParamSchema.parse(req.params);
    const payload = users_schemas_1.updateUserSchema.parse(req.body);
    const user = await (0, users_service_1.updateUser)(id, payload);
    res.json({ data: user });
});
exports.deleteUserHandler = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = users_schemas_1.userIdParamSchema.parse(req.params);
    await (0, users_service_1.deleteUser)(id);
    res.status(204).send();
});
