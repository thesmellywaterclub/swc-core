import type { NextFunction, Request, Response } from "express";

import { logger } from "../logger";

const DEFAULT_STATUS = 500;

export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function createHttpError(statusCode: number, message: string, details?: unknown) {
  return new HttpError(statusCode, message, details);
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(createHttpError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = DEFAULT_STATUS;
  let message = "Internal server error";
  let details: unknown;

  if (error instanceof HttpError) {
    statusCode = error.statusCode;
    message = error.message || message;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  const isServerError = statusCode >= 500;
  if (isServerError) {
    logger.error(error);
  } else {
    logger.warn(error);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}
