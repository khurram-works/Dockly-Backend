import { prisma } from "../../lib/prisma";
import e from "express";

export async function dashboardData(req: e.Request, res: e.Request) {
  try {
    const totalDocs = await prisma.document.count({
      where: { companyId: req.company.id },
    });

    const totalConverstions = await prisma.conversation.count({
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
      take: 5,
      include: {
        messages: {
          where:{
            role: "USER"
          },
          select:{
            id: true,
            content: true,
            createdAt: true,
            


          }
        }
      },
    });
  } catch (err) {}
}
