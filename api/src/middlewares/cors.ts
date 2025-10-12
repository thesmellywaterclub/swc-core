import cors from "cors";

import { env } from "../env";

const allowedOrigins = env.corsOrigins;

export const corsMiddleware = cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
  optionsSuccessStatus: 200,
});
