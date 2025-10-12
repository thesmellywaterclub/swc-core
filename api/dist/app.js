"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = require("./middlewares/cors");
const error_1 = require("./middlewares/error");
const home_1 = require("./modules/home");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, helmet_1.default)());
app.use(cors_1.corsMiddleware);
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.get("/", (_req, res) => {
    res.json({
        service: "SWC API",
        status: "online",
        endpoints: {
            health: "/health",
            home: "/api/home",
        },
    });
});
app.use("/api/home", home_1.homeRoutes);
app.use(error_1.notFoundHandler);
app.use(error_1.errorHandler);
