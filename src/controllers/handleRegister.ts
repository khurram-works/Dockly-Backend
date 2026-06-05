import express from "express";
import z, { success } from "zod";

const registerSchema = z.object({
  company: z.string().min(1, "Company name is required"),
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
    if(!result.success){
      return res.status(401).json({
        message: "Validation Failed",
        errors: result.error.format,
      })
    }

    const {company, name, email, password} = result.data;
    console.log(result.data);
    return res.status(200).json({
      success: true,
      message: "Company registered sucessfully",
    })
  } catch (error) {
    console.log(error)
  }
}
