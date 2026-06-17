import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

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
      id: company.id,
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
    const { question, companyId, sessionId, conversationHistory } = req.body;

    if (!question || !companyId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "question, companyId and sessionId are required",
      });
    }

    let conversation = await prisma.conversation.findUnique({
      where: { sessionId },
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
    const pythonResponse = await fetch("http://localhost:8000/api/query", {
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
    console.log("Step 2:", pythonData);
    const { answer, sources, foundAnswer } = pythonData;

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

    res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
    console.log("Step 5: Stream ended");

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: answer,
        sourceDocuments: sources ? JSON.stringify(sources) : null,
        documentId: sources?.[0]?.documentId ?? null,
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
