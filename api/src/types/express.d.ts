import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      userId: string;
      email: string;
    };
  }
}

declare global {
  namespace Express {
    interface AuthInfo {
      userId: string;
      email: string;
    }
  }
}

export {};
