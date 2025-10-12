import { app } from "./app";
import { env } from "./env";
import { logger } from "./logger";

app.listen(env.port, () => {
  logger.info(`API server listening on port ${env.port}`);
});
