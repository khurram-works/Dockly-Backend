import { prisma } from "../../lib/prisma";
import e from "express";
import { Router } from "express";
import { string, success } from "zod";

const publicRouter = Router();

publicRouter.get("/:slug", async (req: e.Request, res: e.Response) => {
  try {
    const { slug } = req.params;
    if (typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid Slug",
      });
    }
    const chatbotInfo = await prisma.company.findUnique({
      where: { slug },
      select: {
        chatbotName: true,
        welcomeMessage: true,
        slug: true
      },
    });

    if(!chatbotInfo){
      return res.status(400).json({
        success: false,
        message: "Company not found"

      })
    }

    return res.status(200).json({
      success: true,
      chatbotName: chatbotInfo?.chatbotName,
      welcomeMessage: chatbotInfo?.welcomeMessage,
      slug: chatbotInfo?.slug,
    });
  } catch (err) {
    console.log("Error In Retreiving Chatbot Info: ", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error occurred"
    });
  }
});

export default publicRouter;
