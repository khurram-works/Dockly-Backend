import { prisma } from "../../lib/prisma";
import e from "express";

// export interface Source {
//   documentId: string;
//   filename: string;
//   pageNumber: number;
// }

// export interface GroupedSource {
//   documentId: string;
//   filename: string;
//   pages: number[];
// }

function normalizeConversationSources(raw: any[] = []) {
  return raw.flatMap((src) => {
    const pageNumbers = Array.isArray(src.pageNumbers)
      ? src.pageNumbers
      : src.pageNumber
        ? [src.pageNumber]
        : [];

    return pageNumbers.map((pageNumber: number) => ({
      documentId: src.documentId,
      filename: src.filename,
      pageNumber,
    }));
  });
}

export async function conversationDetail(req: e.Request, res: e.Response) {
  const { id } = req.params;
  const companyId = req.company.id;

  if (typeof id !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid ConversationId",
    });
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, companyId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            sourceDocuments: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const messagesWithSources = conversation.messages.map((msg) => {
      const raw = msg.sourceDocuments ? JSON.parse(msg.sourceDocuments) : [];
      const normalized = normalizeConversationSources(raw);

      const grouped = normalized.reduce<Record<string, any>>((acc, src) => {
        if (!acc[src.filename]) {
          acc[src.filename] = {
            documentId: src.documentId,
            filename: src.filename,
            pages: [src.pageNumber],
          };
        } else {
          acc[src.filename].pages.push(src.pageNumber);
        }
        return acc;
      }, {});

      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        sources: Object.values(grouped),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        id: conversation.id,
        isResolved: conversation.isResolved,
        createdAt: conversation.createdAt,
        messages: messagesWithSources,
      },
    });
  } catch (err) {
    console.error("Error retrieving conversation details:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
