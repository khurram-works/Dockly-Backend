import { prisma } from "../../lib/prisma";
import e from "express";
const baseUrl = process.env.FRONTEND_URL;

interface DayCountRow {
  day_index: number;
  count: number;
}

const startOfWeek = new Date();
startOfWeek.setHours(0, 0, 0, 0);
startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

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
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        messages: {
          where: {
            role: "USER",
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            documentId: true,
          },
        },
      },
    });

    const chatBot = await prisma.company.findUnique({
      where: { id: req.company.id },
      select: {
        chatbotName: true,
        slug: true,
      },
    });

    const slug = chatBot?.slug;

    const rawCounts = await prisma.$queryRaw<DayCountRow[]>`
  SELECT 
    EXTRACT(DOW FROM m."createdAt")::int AS day_index, 
    COUNT(*)::int AS count
  FROM messages m
  INNER JOIN conversations c ON m."conversationId" = c.id
  WHERE c."companyId" = ${req.company.id}
    AND m.role = 'USER'::"MessageRole"
    AND m."createdAt" >= ${startOfWeek}
  GROUP BY day_index
  ORDER BY day_index ASC
`;

    const weekdayNames: Record<number, string> = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
      0: "Sunday",
    };

    const questionsByDay = [1, 2, 3, 4, 5, 6, 0].map((index) => {
      const dbMatch = rawCounts.find((row) => row.day_index === index);

      return {
        day: weekdayNames[index],
        count: dbMatch ? dbMatch.count : 0,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Successfully Retrieved Dashboard Data",
      TotalDocs: totalDocs,
      TotalConversations: totalConversations,
      QuestionsAsked: questionsAsked,
      RecentConversations: recentConversations,
      chatBotName: chatBot?.chatbotName,
      chatBotUrl: `${baseUrl}/chat/${slug}`,
      questionsByDay
    });
  } catch (err) {
    console.log(err);
  }
}
