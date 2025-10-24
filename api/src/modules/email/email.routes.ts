import { Router } from "express";

import { sendTransactionalEmailHandler } from "./email.controller";

const router = Router();

router.post("/send", sendTransactionalEmailHandler);

export const emailRoutes = router;
