import express from "express";
import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      rawBody?: unknown;
    }
  }
}

export const rawBodyMiddleware = express.json({
  verify: (req: Request, _res, buf) => {
    req.rawBody = buf;
  },
});
