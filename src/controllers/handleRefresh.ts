import e from "express";
import { prisma } from "../../lib/prisma";
import { signAccessToken, verifyRefresh } from "../service/auth";
import { clearAuthCookies, setAccessTokenCookie } from "../utils/authCookie";
import { isJWTPayload } from "../utils/jwtPayload";

export default async function handleRefresh(req: e.Request, res: e.Response) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token provided." });
    }

    const decoded = verifyRefresh(refreshToken);

    if (!decoded || !isJWTPayload(decoded)) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Invalid refresh token." });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { company: true },
    });

    if (
      !stored ||
      stored.isRevoked ||
      stored.expiresAt < new Date()
    ) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Session expired." });
    }

    const accessToken = signAccessToken(stored.company);
    setAccessTokenCookie(res, accessToken);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
