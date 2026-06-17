import e from "express";
import { prisma } from "../../lib/prisma";
import { success } from "zod";

export async function conversations(req: e.Request, res: e.Response) {
  const page = parseInt(req.query.page as string) || 1;
  const search = String(req.query.search || "");
  const status = String(req.query.status || "ALL");
  const days = Number(req.query.days || 30);
  const limit = 20;
  const date = new Date();
  date.setDate(date.getDate()-days);

  const whereClause: any = {
    companyId: req.company.id
  }

  if (status === 'ANSWERED') {
    whereClause.isResolved = true
  } else if (status === 'UNANSWERED') {
    whereClause.isResolved = false
  }

  if (search) {
    whereClause.messages = {
      some: {
        role: 'USER',
        content: {
          contains: search,
          mode: 'insensitive'
        }
      }
    }
  }

  if(days){
    whereClause.createdAt ={
      gte: date
    }
  }


  try {
    const [totalConversations, unansweredCount, answeredCount] =
      await Promise.all([
        await prisma.conversation.count({
          where: {
            companyId: req.company.id,
          },
        }),
        await prisma.conversation.count({
          where: {
            companyId: req.company.id,
            isResolved: false,
          },
        }),
        await prisma.conversation.count({
          where: {
            companyId: req.company.id,
            isResolved: true,
          },
        }),
      ]);

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: (page - 1) * 20,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: {
            role: true,
            content: true,
            createdAt: true,
            sourceDocuments: true,
          },
        },
      },
    });

    const tableRows = conversations.map((conv, index) => {
      const userMessage = conv.messages.find((m) => m.role === "USER");
      const aiMessage = conv.messages.find((m) => m.role === "ASSISTANT");

      return {
        id: conv.id,
        number: totalConversations - index,

        question: userMessage?.content || "No question",

        answerPreview: aiMessage
          ? aiMessage.content.slice(0, 100) +
            (aiMessage.content.length > 100 ? "..." : "")
          : "No answer yet",

        status: conv.isResolved ? "ANSWERED" : "UNANSWERED",
        createdAt: conv.createdAt,
        isResolved: conv.isResolved,
        updatedAt: conv.updatedAt,
      };
    });
    const totalPages = Math.ceil(totalConversations / limit);

    return res.status(201).json({
      success: true,
      data: {
        conversations: tableRows,
        pagination: {
          totalConversations,
          unansweredCount,
          answeredCount,
          currentPage: page,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          totalPages,
        },
      },
    });
  } catch (err) {
    console.log("Error fetching conversations", err);
  }
}
