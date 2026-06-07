import type { JWTPayload } from "../types/auth";

export function isJWTPayload(obj: unknown): obj is JWTPayload {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.email === "string";
}
