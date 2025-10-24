import express from "express";
import helmet from "helmet";

import { corsMiddleware } from "./middlewares/cors";
import { errorHandler, notFoundHandler } from "./middlewares/error";
import { cartRoutes } from "./modules/cart";
import { checkoutRoutes } from "./modules/checkout";
import { homeRoutes } from "./modules/home";
import { emailRoutes } from "./modules/email";
import { ordersRoutes } from "./modules/orders";
import { paymentsRoutes } from "./modules/payments";
import { productsRoutes } from "./modules/products";
import { authRoutes, usersRoutes } from "./modules/users";

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

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
      auth: "/api/auth",
      cart: "/api/cart",
      email: "/api/email",
      products: "/api/products",
      users: "/api/users",
      checkout: "/api/checkout",
      orders: "/api/orders",
      payments: "/api/payments",
    },
  });
});

app.use("/api/home", homeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/users", usersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
