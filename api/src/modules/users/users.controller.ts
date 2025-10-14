import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from "./users.service";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from "./users.schemas";

export const listUsersHandler = asyncHandler(async (req, res) => {
  const { limit, cursor } = listUsersQuerySchema.parse(req.query);
  const result = await listUsers({ limit, cursor });
  res.json({
    data: result.data,
    meta: {
      nextCursor: result.nextCursor ?? null,
    },
  });
});

export const getUserByIdHandler = asyncHandler(async (req, res) => {
  const { id } = userIdParamSchema.parse(req.params);
  const user = await getUserById(id);
  res.json({ data: user });
});

export const createUserHandler = asyncHandler(async (req: Request, res) => {
  const payload = createUserSchema.parse(req.body);
  const user = await createUser(payload);
  res.status(201).json({ data: user });
});

export const updateUserHandler = asyncHandler(async (req: Request, res) => {
  const { id } = userIdParamSchema.parse(req.params);
  const payload = updateUserSchema.parse(req.body);
  const user = await updateUser(id, payload);
  res.json({ data: user });
});

export const deleteUserHandler = asyncHandler(async (req, res) => {
  const { id } = userIdParamSchema.parse(req.params);
  await deleteUser(id);
  res.status(204).send();
});
