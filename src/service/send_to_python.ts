import {prisma} from "../../lib/prisma"



export const sendToPythonService = async (
  documentId: string,
  companyId: string,
  fileUrl: string,
  filename: string
) => {
  try {
    const response = await fetch("http://localhost:8000/api/process-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        companyId,
        fileUrl,
        filename,
      }),
    });

    const result = await response.json();

    if (result.success) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "PROCESSED",
          chunkCount: result.chunksCreated,
          pageCount: result.pageCount,
        },
      });
      console.log(`Document ${documentId} processed successfully`);
    } else {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          errorMessage: result.detail || "Processing failed",
        },
      });
      console.log(`Document ${documentId} processing failed: ${result.detail}`);
    }
  } catch (err) {
    // Python unreachable or crashed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: "Processing service unavailable",
      },
    });
    console.log(`Python service unreachable for document ${documentId}`);
  }
};
// Now in your uploadDocument function, replace the entire fetch block with one clean line:
// typescript// REMOVE THIS entire fetch block:
// fetch("http://localhost:8000/api/process-document", {
//   method: "POST",
//   // ... all the way to the last .catch
// })

// // REPLACE WITH THIS one line:
// sendToPythonService(
//   document.id,
//   companyId,
//   fileUrl,
//   req.file.originalname
// );
// No await — runs in background while we respond to frontend immediately