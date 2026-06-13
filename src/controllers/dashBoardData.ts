import { prisma } from "../../lib/prisma";
import e from "express";
const baseUrl = process.env.FRONTEND_URL

export async function dashboardData(req: e.Request, res: e.Response) {
  try {
    const totalDocs = await prisma.document.count({
      where: { companyId: req.company.id },
    });

    const totalConversations = await prisma.conversation.count({
      where: { companyId: req.company.id },
    });

    const questionsAsked = await prisma.message.count({
      where: {
        conversation: { companyId: req.company.id },
        role: "USER",
      },
    });

    const recentConversations = await prisma.conversation.findMany({
      where: {
        companyId: req.company.id,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        messages: {
          where:{
            role: "USER"
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select:{
            id: true,
            content: true,
            createdAt: true,
            documentId: true
          }
        }
      },
    });

    const chatBot = await prisma.company.findUnique({
      where: {id: req.company.id},
      select:{
        chatbotName: true,
        slug: true
      }
    })

    const slug = chatBot?.slug

    return res.status(201).json({
      success: true,
      message: "Successfully Retrieved Dashboard Data",
      TotalDocs: totalDocs,
      TotalConversations: totalConversations,
      QuestionsAsked: questionsAsked,
      RecentConversations: recentConversations,
      chatBotName: chatBot?.chatbotName,
      chatBotUrl: `${baseUrl}/chat/${slug}`
    });
  } catch (err) {
    console.log(err)
  }
}
