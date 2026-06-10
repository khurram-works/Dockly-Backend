import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import e from "express";
import {
  uploadDocument,
  getDocuments,
  reprocessDocument,
  deleteDocument,
} from "../controllers/handleDocumentUpload";
import { handleUpload } from "../middleware/upload_middleware";
import {prisma} from "../../lib/prisma"

const baseUrl = process.env.FRONTEND_URL

const companyRouter = Router();
companyRouter.use(authenticateToken);

companyRouter.get("/", async(req: e.Request, res: e.Response) => {
  try {
    const chatbotUrl = await prisma.company.findFirst({
      where: {id: req.company.id,
        email: req.company.email
      },
      select:{
        slug: true
    }
    })
    const slug = chatbotUrl?.slug

    return res.status(201).json({
      success: true,
      message: "Successfully Retrieved Dashboard Data",
      chatbotUrl: `${baseUrl}/chat/${slug}`
    });
  } catch (err) {
    console.log(err);
  }
});

companyRouter.post("/documents", handleUpload, uploadDocument);
companyRouter.get("/documents", getDocuments);
companyRouter.post(
  "/:documentId/reprocess",
  reprocessDocument,
);

companyRouter.delete("/:documentId/delete", deleteDocument)

export default companyRouter;
