import {prisma} from "../../lib/prisma"

export const sendToPythonService = async (
  documentId: string,
  companyId: string,
  fileUrl: string,
  filename: string
) => {
  try {
    const response = await fetch(`${process.env.RAG_SERVICE_URL}/api/process-document`, {
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
