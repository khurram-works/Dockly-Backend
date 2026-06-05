import e from "express";
import z from "zod";

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


export default async function handleLogin (req: e.Request, res:e.Response){
  try{
    const result = loginSchema.safeParse(req.body);
    if(!result.success){
      return res.status(401).json({
        errors: result.error.format
      })
    }

    return res.status(201).json({
      success: true,
      message: "Login Successful",
    })

  }catch(err){
    console.log(err)
  }
}