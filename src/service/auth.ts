import jwt, { type SignOptions } from "jsonwebtoken";
import type { Company } from "../../generated/prisma/client";
import type { JWTPayload } from "../types/auth";

type TokenExpiresIn = NonNullable<SignOptions["expiresIn"]>;

const ACCESS_TOKEN_EXPIRES_IN: TokenExpiresIn = (
  process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m"
) as TokenExpiresIn;

const REFRESH_TOKEN_EXPIRES_IN: TokenExpiresIn = (
  process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d"
) as TokenExpiresIn;

const JWT_Access = process.env.JWT_Access_Token!;
const JWT_Refresh = process.env.JWT_Refresh_Token!;

function buildPayload(company: Company): JWTPayload {
  return {
    id: company.id,
    email: company.email,
  };
}

export function signAccessToken(company: Company): string {
  return jwt.sign(buildPayload(company), JWT_Access, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function signRefreshToken(company: Company): string {
  return jwt.sign(buildPayload(company), JWT_Refresh, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function setupJWT(company: Company) {
  return {
    token: signAccessToken(company),
    refreshToken: signRefreshToken(company),
  };
}

export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, JWT_Access);
  } catch (err) {
    console.log("JWT verification failed:", err);
    return null;
  }
}

export function verifyRefresh(token: string) {
  try {
    return jwt.verify(token, JWT_Refresh);
  } catch (err) {
    console.log("Refresh token verification failed:", err);
    return null;
  }
}
