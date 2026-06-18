import { prisma } from "../../lib/prisma";
import e from "express";
import { Prisma } from "../../generated/prisma/client";

interface DayCountRow {
  day_index: number;
  count: number;
}

export default async function analyticsSummary(
  req: e.Request,
  res: e.Response,
) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const startOfMonth = new Date();
  startOfMonth.setHours(0, 0, 0, 0);
  startOfMonth.setDate(1);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const daysInRange =
    Math.floor(
      (today.getTime() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1;

  const startOfNextMonth = new Date(startOfMonth);
  startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  try {
    const [
      questionsToday,
      questionsThisMonth,
      allConversations,
      unansweredCount,
      totalDocs,
    ] = await Promise.all([
      prisma.message.count({
        where: {
          conversation: { companyId: req.company.id },
          role: "USER",
          createdAt: { gte: startOfToday, lt: startOfTomorrow },
        },
      }),
      prisma.message.count({
        where: {
          conversation: { companyId: req.company.id },
          role: "USER",
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
      prisma.conversation.count({
        where: {
          companyId: req.company.id,
        },
      }),
      prisma.conversation.count({
        where: {
          companyId: req.company.id,
          isResolved: false,
        },
      }),
      prisma.document.count({
        where: {
          companyId: req.company.id,
        },
      }),
    ]);

    const messages = await prisma.message.findMany({
      where: {
        conversation: { companyId: req.company.id },
        role: "USER",
        createdAt: {
          gte: startOfMonth,
          lte: today,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const chartData = Array.from({ length: daysInRange }, (_, index) => {
      const dayDate = new Date(startOfMonth);
      dayDate.setDate(startOfMonth.getDate() + index);
      return {
        date: `Day ${index + 1}`,
        count: 0,
        targetDateString: dayDate.toDateString(),
      };
    });

    messages.forEach((msg) => {
      const msgDateString = new Date(msg.createdAt).toDateString();
      const dayBucket = chartData.find(
        (day) => day.targetDateString === msgDateString,
      );
      if (dayBucket) dayBucket.count++;
    });

    const finalChartData = chartData.map(({ date, count }) => ({
      date,
      count,
    }));

    // const popularQuestions = await prisma.message.groupBy({
    //   by: ["content"],
    //   where: {
    //     role: "USER",
    //     conversation: { companyId: req.company.id },
    //     createdAt: { gte: thirtyDaysAgo },
    //   },
    //   _count: { content: true },
    //   orderBy: { _count: { content: "desc" } },
    //   take: 5,
    // });

    const recentUserMessages = await prisma.message.findMany({
      where: {
        role: "USER",
        conversation: { companyId: req.company.id },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { content: true },
    });

    const normalizeText = (str: string) =>
      str
        .replace(/[^\x20-\x7E]/g, " ")
        .trim()
        .toLowerCase()
        .replace(/[?.!]+$/, "")
        .replace(/\s+/g, " ")
        .trim();

    const normalized = recentUserMessages.map((m) => normalizeText(m.content));

    const countMap = normalized.reduce<Record<string, number>>((acc, q) => {
      acc[q] = (acc[q] ?? 0) + 1;
      return acc;
    }, {});

    const popularQuestions = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([content, count]) => ({
        content,
        _count: { content: count },
      }));

    const rawCounts = await prisma.$queryRaw<DayCountRow[]>`
      SELECT
        EXTRACT(DOW FROM m."createdAt")::int AS day_index,
        COUNT(DISTINCT m."conversationId")::int AS count
      FROM messages m
      INNER JOIN conversations c
        ON m."conversationId" = c.id
      WHERE c."companyId" = ${req.company.id}
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

    const dayOfWeekDistribution = [1, 2, 3, 4, 5, 6, 0].map((index) => {
      const dbMatch = rawCounts.find(
        (row) => Math.floor(row.day_index) === index,
      );
      return {
        day: weekdayNames[index],
        count: dbMatch ? dbMatch.count : 0,
      };
    });

    const conversationsWithMessages = await prisma.conversation.findMany({
      where: {
        companyId: req.company.id,
      },
      select: {
        messages: {
          select: {
            role: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 20,
        },
      },
      take: 100,
    });

    const responseTimes: number[] = [];

    for (const conversation of conversationsWithMessages) {
      const msgs = conversation.messages;

      for (let i = 0; i < msgs.length - 1; i++) {
        const userMsg = msgs[i];
        const assistantMsg = msgs[i + 1];

        if (
          userMsg &&
          assistantMsg &&
          userMsg.role === "USER" &&
          assistantMsg.role === "ASSISTANT"
        ) {
          const userTime = userMsg.createdAt.getTime();
          const aiTime = assistantMsg.createdAt.getTime();

          const diffSeconds = (aiTime - userTime) / 1000;

          if (diffSeconds > 0 && diffSeconds < 60) {
            responseTimes.push(diffSeconds);
          }
        }
      }
    }

    const avgResponseTime =
      responseTimes.length > 0
        ? Number(
            (
              responseTimes.reduce((sum, time) => sum + time, 0) /
              responseTimes.length
            ).toFixed(1),
          )
        : null;

    const recentDocuments = await prisma.document.findMany({
      where: { companyId: req.company.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        filename: true,
        status: true,
        updatedAt: true,
      },
    });

    const recentConversations = await prisma.conversation.findMany({
      where: { companyId: req.company.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        updatedAt: true,
        isResolved: true,
        messages: {
          where: { role: "USER" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true },
        },
      },
    });

    const documentEvents = recentDocuments.map((doc) => ({
      type: "document",
      icon: "📄",
      text: `${doc.filename} ${doc.status === "PROCESSED" ? "uploaded and processed" : doc.status === "FAILED" ? "failed to process" : "is being processed"}`,
      updatedAt: doc.updatedAt,
    }));

    const conversationEvents = recentConversations
      .filter((conv) => conv.messages.length > 0)

      .map((conv) => ({
        type: "conversation",
        icon: "💬",
        text: `Customer asked "${conv.messages[0]!.content.slice(0, 60)}${conv.messages[0]!.content.length > 60 ? "..." : ""}"`,
        updatedAt: conv.updatedAt,
      }));

    const activityFeed = [...documentEvents, ...conversationEvents]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        questionsToday,
        questionsThisMonth,
        allConversations,
        unansweredCount,
        totalDocs,
        avgResponseTime,
        timeline: finalChartData,
        popularQuestions,
        dayOfWeekDistribution,
        activityFeed,
      },
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching analytics.",
    });
  }
}
