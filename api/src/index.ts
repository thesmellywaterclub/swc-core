import { app } from "./app";
import { env } from "./env";
import { logger } from "./logger";

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection. Shutting down.");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error(error, "Uncaught exception. Shutting down.");
  process.exit(1);
});

const server = app.listen(env.port, () => {
  logger.info(`API server listening on port ${env.port}`);
});

server.on("error", (error) => {
  logger.error(error, "HTTP server error");
});
