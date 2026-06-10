import { prisma } from "../../lib/prisma";


import { sendToPythonService } from "../service/send_to_python";
export const processStuckDocuments = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const stuckDocuments = await prisma.document.findMany({
      where: {
        status: "PROCESSING",
        updatedAt: {
          lt: fiveMinutesAgo,
        },
      },
    });

    if (stuckDocuments.length === 0) {
      console.log("No stuck documents found");
      return;
    }

    console.log(`Found ${stuckDocuments.length} stuck documents — reprocessing...`);
    for (const document of stuckDocuments) {
      console.log(`Reprocessing stuck document: ${document.filename}`);
      sendToPythonService(
        document.id,
        document.companyId,
        document.fileUrl,
        document.filename
      );
    }

  } catch (error) {
    console.error("Error in processStuckDocuments job:", error);
  }
};