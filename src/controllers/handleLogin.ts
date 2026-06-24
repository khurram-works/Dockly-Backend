import e from "express";
import z, { success } from "zod";
import { Company } from "../models/company";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { setupJWT } from "../service/auth";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../utils/authCookie";

const verifyCompany = new Company();

const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      "Password must contain uppercase, lowercase, number and special character",
    ),
});

export default async function handleLogin(req: e.Request, res: e.Response) {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(401).json({
        errors: result.error.format(),
      });
    }

    const { email, password } = result.data;

    const verifyComp = await verifyCompany.existingCompany(email);
    if (!verifyComp) {
      return res.status(401).json({ error: "Invalid email." });
    }

    const validPassword = await bcrypt.compare(password, verifyComp.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password." });
    }

    await prisma.company.update({
      where: { id: verifyComp.id },
      data: { isActive: true },
    });

    const { token, refreshToken } = setupJWT(verifyComp);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        company: {
          connect: { id: verifyComp.id },
        },
      },
    });

    setAccessTokenCookie(res, token);
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: "Login successful",
      company: {
        id: verifyComp.id,
        email: verifyComp.email,
      },
      success: true,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
