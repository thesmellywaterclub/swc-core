"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const env_1 = require("../env");
const allowedOrigins = env_1.env.corsOrigins;
exports.corsMiddleware = (0, cors_1.default)({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
    optionsSuccessStatus: 200,
});
