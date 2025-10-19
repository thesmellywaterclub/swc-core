import { Router } from "express";

import { authenticate } from "../../middlewares/auth";
import {
  loginHandler,
  meHandler,
  registerHandler,
  requestEmailOtpHandler,
} from "./auth.controller";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/email-otp", requestEmailOtpHandler);
router.get("/me", authenticate(), meHandler);

export const authRoutes = router;
