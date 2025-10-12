import { Router } from "express";

import { getHomePage } from "./home.controller";

const router = Router();

router.get("/", getHomePage);

export const homeRoutes = router;
