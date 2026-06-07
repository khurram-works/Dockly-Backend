import type { JWTPayload } from "../auth";

declare global {
  namespace Express {
    interface Request {
      company?: JWTPayload;
    }
  }
}

export {};
