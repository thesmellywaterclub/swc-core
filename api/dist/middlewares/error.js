"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.createHttpError = createHttpError;
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const logger_1 = require("../logger");
const DEFAULT_STATUS = 500;
class HttpError extends Error {
    statusCode;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.HttpError = HttpError;
function createHttpError(statusCode, message, details) {
    return new HttpError(statusCode, message, details);
}
function notFoundHandler(req, _res, next) {
    next(createHttpError(404, `Route ${req.method} ${req.originalUrl} not found`));
}
function errorHandler(error, _req, res, _next) {
    let statusCode = DEFAULT_STATUS;
    let message = "Internal server error";
    let details;
    if (error instanceof HttpError) {
        statusCode = error.statusCode;
        message = error.message || message;
        details = error.details;
    }
    else if (error instanceof Error) {
        message = error.message || message;
    }
    const isServerError = statusCode >= 500;
    if (isServerError) {
        logger_1.logger.error(error);
    }
    else {
        logger_1.logger.warn(error);
    }
    res.status(statusCode).json({
        error: {
            message,
            ...(details ? { details } : {}),
        },
    });
}
