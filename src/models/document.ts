import { prisma } from "../../lib/prisma";

export class Document {
  async createDocument(
    id: string,
    companyId: string,
    filename: string,
    fileSize: number,
    fileUrl: string,
  ) {
    try {
      const document = await prisma.document.create({
        data: {
          id,
          // We use the ID we generated above — must match what we used in R2 key

          companyId,
          filename,
          fileSize,
          // size is in bytes — multer gives us this automatically

          fileUrl,
          // Document starts as PROCESSING
          // Python service will change this to PROCESSED when done
        },
      });
      return document;
    } catch (err) {
      console.error("createDocument error:", err);
      throw err;
    }
  }


  async getDocuments(companyId: string, page: number){
    const limit = 4
    try{
      const documents = await prisma.document.findMany({
        where: { companyId },
        orderBy: { updatedAt: "desc" },
        take: limit, 
        skip: (page - 1) * limit,
        select: {
          id: true,
          filename: true,
          fileSize: true,
          status: true,
          createdAt: true,
          updatedAt: true
        },
      });

      const totalDocs = await prisma.document.count({
        where: {
          companyId
        }
      })
      const totalPages = Math.ceil(totalDocs/limit)     

      return {
        documents,
        pagination: {
          totalDocs,
          totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };

    }catch(err){
      console.error("Getting Documents error:", err);
      throw err;
    }

  }

  async findDocument(id: string, companyId: string){
    try{

      const document = await prisma.document.findFirst({
        where: {
          id,
          companyId,
          // This double check is critical for security
          // Without companyId here, Company A could delete Company B's documents
          // by just knowing the document ID
        },
      });
  
     return document

    }catch(err){
      console.error("Finding Document error:", err);
      throw err;
    }
  }
}
