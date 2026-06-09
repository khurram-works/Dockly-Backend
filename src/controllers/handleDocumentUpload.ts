import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import {
  uploadToSupabase,
  deleteFromSupabase,
  generateStorageKey,
} from "../service/upload_service";
import { createId } from "@paralleldrive/cuid2";
import { Document } from "../models/document";
// cuid generates random IDs — same as what Prisma uses

// ─────────────────────────────────────────────
// uploadDocument
// Handles the complete upload flow
// ─────────────────────────────────────────────

const doc = new Document();
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    // Step 1: Make sure a file was actually included in the request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    // Step 2: Get the company from the JWT (your auth middleware puts it here)
    // You should already have this from your auth work
    const companyId = req.company.id;

    // Step 3: Generate a new document ID
    // We generate this ourselves so we can use it in the R2 key
    // before creating the database record
    const documentId = createId();

    // Step 4: Generate the R2 key (the file's path in the bucket)
    const r2Key = generateStorageKey(
      companyId,
      documentId,
      req.file.originalname,
      // originalname = the filename from the user's computer
      // e.g. "ReturnPolicy.pdf"
    );

    // Step 5: Upload the file to R2
    // req.file.buffer = the raw PDF data in memory (thanks to multer)
    // req.file.mimetype = "application/pdf"
    const fileUrl = await uploadToSupabase(
      req.file.buffer,
      r2Key,
      req.file.mimetype,
    );
    // fileUrl is now something like:
    // "https://abc123.r2.cloudflarestorage.com/dockly-documents/documents/..."

    // Step 6: Save the document record in PostgreSQL

    const document = await doc.createDocument(
      documentId,
      companyId,
      req.file.originalname,
      req.file.size,
      fileUrl,
    );
    // const document = await prisma.document.create({
    //   data: {
    //     id: documentId,
    //     // We use the ID we generated above — must match what we used in R2 key

    //     companyId,
    //     filename: req.file.originalname,
    //     fileSize: req.file.size,
    //     // size is in bytes — multer gives us this automatically

    //     fileUrl,
    //     // Document starts as PROCESSING
    //     // Python service will change this to PROCESSED when done
    //   },
    // });

    // Step 7: Tell Python service to process this document
    // We'll build this in Step 2 — for now just log it
    console.log(
      `Document ${documentId} uploaded, ready to send to Python service`,
    );
    // In Step 2, this becomes:
    // await notifyPythonService(document)
    // Call Python service to process the document
    // Don't await this — let it run in the background
    // The document status will update in PostgreSQL when Python finishes
    fetch("http://localhost:8000/api/process-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: document.id,
        companyId: companyId,
        fileUrl: fileUrl,
        filename: req.file.originalname,
      }),
    })
      .then(async (res) => {
        const result = await res.json();
        if (result.success) {
          // Update document status to PROCESSED in PostgreSQL
          await prisma.document.update({
            where: { id: document.id },
            data: {
              status: "PROCESSED",
              chunkCount: result.chunksCreated,
              pageCount: result.pageCount,
            },
          });
        } else {
          // Update status to FAILED
          await prisma.document.update({
            where: { id: document.id },
            data: {
              status: "FAILED",
              errorMessage: result.detail || "Processing failed",
            },
          });
        }
      })
      .catch(async (err) => {
        // Python service unreachable or crashed
        await prisma.document.update({
          where: { id: document.id },
          data: {
            status: "FAILED",
            errorMessage: "Processing service unavailable",
          },
        });
      });

    // Step 8: Return success to the frontend
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

// ─────────────────────────────────────────────
// getDocuments
// Returns all documents for the logged-in company
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// deleteDocument
// Removes document from both R2 and PostgreSQL
// ─────────────────────────────────────────────
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

    // Step 1: Find the document and verify it belongs to this company
    const document = await doc.deleteDocument(documentId, companyId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Step 2: Reconstruct the R2 key from the stored information
    const supabaseKey = generateStorageKey(
      companyId,
      documentId,
      document.filename,
    );

    // Step 3: Delete from R2 first
    await deleteFromSupabase(supabaseKey);

    // Step 4: Delete from PostgreSQL
    // Cascade will automatically delete related Messages too
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Step 5: In Step 2, you'll also tell Python to delete
    // vectors from Qdrant for this document

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
