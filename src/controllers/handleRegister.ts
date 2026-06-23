import express from "express";
import z from "zod";
import { Company } from "../models/company";

const companyRegistration = new Company();

const registerSchema = z.object({
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with a hyphen.",
    ),
  name: z.string().min(1, "Full name is required"),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      "Password must contain uppercase, lowercase, number and special character",
    ),
});

export default async function handleRegister(
  req: express.Request,
  res: express.Response,
) {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(401).json({
        message: "Validation Failed",
        errors: result.error.format(),
      });
    }
    const { slug, name, email, password } = result.data;

    const existingCompany = await companyRegistration.existingCompany(email);
    if (existingCompany) {
      return res.status(400).json({ error: "Company Already Registered" });
    }

    const existingSlug = await companyRegistration.existingSlug(slug);
    if (existingSlug) {
      return res
        .status(400)
        .json({ error: "Slug Already taken change your Slug" });
    }

    return res.status(200).json({
      success: true,
      message: "Company registered successfully",
    });
  } catch (err) {
    console.error("Error during user signup:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
