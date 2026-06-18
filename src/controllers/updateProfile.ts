import { success } from "zod";
import {prisma} from "../../lib/prisma";
import e from "express";
import z from "zod";


const profileSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with a hyphen.",
    ),
  name: z.string().min(1, "Full name is required"),
  email: z.email("Invalid email address"),
  chatbotName: z.string().min(8, "Chatbot Name must be 8 characters long."),
});

export async function updateProfile(req: e.Request, res: e.Response){
  try{

    const result = profileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(401).json({
        message: "Validation Failed",
        errors: result.error.format(),
      });
    }

    const {slug , name, email, chatbotName} = result.data

    const existingSlug = await prisma.company.findUnique({
      where:{
        slug: slug
      }
    })
    if (existingSlug) {
      return res
        .status(400)
        .json({success: false, message: "Slug Already taken change your Slug" });
    }
    
    await prisma.company.update({
      where: {
        id: req.company.id
      },
      data:{
        slug: slug,
        name: name,
        email: email,
        chatbotName: chatbotName
      }
    })

    return res.status(200).json({
      success: true
    })

  }catch(err){
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to update the profile"
    })
  }
}