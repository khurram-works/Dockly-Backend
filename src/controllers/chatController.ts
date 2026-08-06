import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

function normalizeSources(sources: any[] = []) {
  const normalized = sources
    .map((src) => {
      const pageNumbers = Array.isArray(src.pageNumbers)
        ? src.pageNumbers
        : src.pageNumber
        ? [src.pageNumber]
        : [];

      return {
        documentId: typeof src.documentId === "string" ? src.documentId : null,
        filename: typeof src.filename === "string" ? src.filename : null,
        pageNumbers: pageNumbers.filter((page: unknown) => Number.isInteger(page)),
      };
    })
    .filter((src) => src.documentId && src.filename);

  return Array.from(
    new Map(
      normalized.map((src) => [
        `${src.documentId}:${src.filename}:${src.pageNumbers.join(",")}`,
        src,
      ]),
    ).values(),
  );
}

export const getChatbotInfo = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid Slug",
      });
    }

    const company = await prisma.company.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        chatbotName: true,
        welcomeMessage: true,
        isActive: true,
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Chatbot not found",
      });
    }

    if (!company.isActive) {
      return res.status(403).json({
        success: false,
        message: "This chatbot is currently inactive",
      });
    }

    return res.status(200).json({
      success: true,
      slug: company.slug,
      chatbotName: company.chatbotName,
      welcomeMessage: company.welcomeMessage,
    });
  } catch (error) {
    console.error("getChatbotInfo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load chatbot",
    });
  }
};

export const sendChatMessage = async (req: Request, res: Response) => {
  try {
    const { question, slug, sessionId, conversationHistory } = req.body;

    if (!question || !slug || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "question, slug and sessionId are required",
      });
    }

    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Chatbot not found",
      });
    }

    if (!company.isActive) {
      return res.status(403).json({
        success: false,
        message: "This chatbot is currently inactive",
      });
    }

    const companyId = company.id;

    let conversation = await prisma.conversation.findFirst({
      where: { sessionId, companyId },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          companyId,
          sessionId,
          isResolved: false,
        },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: question,
      },
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const pythonResponse = await fetch(`${process.env.RAG_SERVICE_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        companyId,
        conversationHistory: conversationHistory || [],
      }),
    });

    if (!pythonResponse.ok) {
      res.write(
        `data: ${JSON.stringify({ type: "error", content: "AI service unavailable" })}\n\n`,
      );
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
      return;
    }

    console.log("Step 1: Request received");

    const pythonData = await pythonResponse.json();
    console.log("Step 2:", "Python data received successfully.");
    const { answer, sources, foundAnswer } = pythonData;
    const normalizedSources = normalizeSources(sources);

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { isResolved: foundAnswer },
    });

    const words = answer.split(" ");
    console.log("Step 4: Streaming response");

    for (const word of words) {
      res.write(
        `data: ${JSON.stringify({ type: "chunk", content: word + " " })}\n\n`,
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    res.write(
      `data: ${JSON.stringify({ type: "sources", sources: normalizedSources })}\n\n`,
    );
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
    console.log("Step 5: Stream ended");

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: answer,
        sourceDocuments:
          normalizedSources.length > 0
            ? JSON.stringify(normalizedSources)
            : null,
        documentId: normalizedSources?.[0]?.documentId ?? null,
      },
    });
    console.log("Step 6: Assistant message saved");
  } catch (error) {
    console.error("sendChatMessage error:", error);
    if (res.headersSent) {
      res.write(
        `data: ${JSON.stringify({ type: "error", content: "Something went wrong" })}\n\n`,
      );
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } else {
      res
        .status(500)
        .json({ success: false, message: "Failed to process message" });
    }
  }
};
