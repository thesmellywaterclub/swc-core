"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.homeRoutes = void 0;
const express_1 = require("express");
const home_controller_1 = require("./home.controller");
const router = (0, express_1.Router)();
router.get("/", home_controller_1.getHomePage);
exports.homeRoutes = router;
