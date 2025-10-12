"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./env");
const logger_1 = require("./logger");
app_1.app.listen(env_1.env.port, () => {
    logger_1.logger.info(`API server listening on port ${env_1.env.port}`);
});
