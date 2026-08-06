import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import {
  uploadToSupabase,
  deleteFromSupabase,
  generateStorageKey,
} from "../service/upload_service";
import { createId } from "@paralleldrive/cuid2";
import { Document } from "../models/document";
import { sendToPythonService } from "../service/send_to_python";

const doc = new Document();
export const uploadDocument = async (req: Request, res: Response) => {
  const companyId = req.company.id;

  const documentId = createId();
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }
    const Filename = req.file.originalname;

    const already_uploaded_document = await prisma.document.findFirst({
      where: { companyId, filename: Filename },
    });

    if (already_uploaded_document) {
      return res.status(400).json({
        success: false,
        message: "Document already exists",
      });
    }

    const r2Key = generateStorageKey(
      companyId,
      documentId,
      req.file.originalname,
    );

    const fileUrl = await uploadToSupabase(
      req.file.buffer,
      r2Key,
      req.file.mimetype,
    );

    const document = await doc.createDocument(
      documentId,
      companyId,
      req.file.originalname,
      req.file.size,
      fileUrl,
    );
    console.log(
      `Document ${documentId} uploaded, ready to send to Python service`,
    );

    sendToPythonService(document.id, companyId, fileUrl, req.file.originalname);

    return res.status(202).json({
      success: true,
      message: "Document uploaded successfully. Processing has started.",
      document: {
        id: document.id,
        filename: document.filename,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed. Please try again.",
    });
  }
};

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const companyId = req.company.id;
    const page = Number(req.query.page) || 1;

    const documents = await doc.getDocuments(companyId, page);

    return res.status(200).json({
      success: true,
      documents: documents.documents,
      pagination: documents.pagination,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
    });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const companyId = req.company.id;
    const { documentId } = req.params;
    if (typeof documentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid documentId",
      });
    }

    const document = await doc.findDocument(documentId, companyId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const response = await fetch(
      `${process.env.RAG_SERVICE_URL}/api/delete-document/${documentId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => null);
      console.error("RAG delete failed:", response.status, errorBody);
      return res.status(502).json({
        success: false,
        message: "Failed to delete document vectors from RAG service",
      });
    }

    const supabaseKey = generateStorageKey(
      companyId,
      documentId,
      document.filename,
    );

    await deleteFromSupabase(supabaseKey);

    await prisma.document.delete({
      where: { id: documentId },
    });

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document",
    });
  }
};

export const reprocessDocument = async (req: Request, res: Response) => {
  try {
    const companyId = req.company.id;
    const { documentId } = req.params;
    if (typeof documentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid documentId",
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        companyId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.status === "PROCESSED") {
      return res.status(400).json({
        success: false,
        message: "Document is already processed successfully",
      });
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    if (
      document.status === "PROCESSING" &&
      document.updatedAt > twoMinutesAgo
    ) {
      return res.status(400).json({
        success: false,
        message: "Document is already being processed. Please wait.",
      });
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "PROCESSING",
        errorMessage: null,
      },
    });

    sendToPythonService(
      document.id,
      document.companyId,
      document.fileUrl,
      document.filename,
    );

    return res.status(200).json({
      success: true,
      message: "Reprocessing started",
    });
  } catch (error) {
    console.error("Reprocess error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start reprocessing",
    });
  }
};
