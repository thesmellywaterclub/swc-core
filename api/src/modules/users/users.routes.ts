import { Router } from "express";

import {
  createUserHandler,
  deleteUserHandler,
  getUserByIdHandler,
  listUsersHandler,
  updateUserHandler,
} from "./users.controller";

const router = Router();

router.get("/", listUsersHandler);
router.post("/", createUserHandler);
router.get("/:id", getUserByIdHandler);
router.patch("/:id", updateUserHandler);
router.delete("/:id", deleteUserHandler);

export const usersRoutes = router;
