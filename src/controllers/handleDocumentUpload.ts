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
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    const companyId = req.company.id;

    const documentId = createId();

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

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
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

    const documents = await doc.getDocuments(companyId);

    return res.status(200).json({
      success: true,
      documents,
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

    try {
      const response = await fetch(`http://localhost:8000/api/delete-document/${documentId}`, {
        method: "DELETE",
      });
      console.log(response.json())
    } catch (qdrantError) {
      console.error("Qdrant deletion failed:", qdrantError);
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
