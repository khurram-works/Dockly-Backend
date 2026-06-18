import { success } from "zod";
import {prisma} from "../../lib/prisma";
import e from "express";
import bcrypt from "bcrypt";
import z from "zod";


const passwordSchema = z
    .object({
      currentPassword: z.string().min(8, "Current password is required"),

      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
          "Password must contain uppercase, lowercase, number and special character",
        ),
    })


export async function updatePassword(req: e.Request, res: e.Response){
  try{
    const result = passwordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(401).json({
        message: "Validation Failed",
        errors: result.error.format(),
      });
    }

    const {currentPassword ,password} = result.data

    const company = await prisma.company.findUnique({
      where:{
        id: req.company.id
      }
    })

    const validPassword = await bcrypt.compare(currentPassword, company!.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid Current Password" });
    }

    const hashedpassword = await bcrypt.hash(password, 10)


    await prisma.company.update({
      where: {
        id: req.company.id
      },
      data:{
        password: hashedpassword
      }
    })

    return res.status(200).json({
      success: true
    })

  }catch(err){
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to update the password"
    })
  }
}