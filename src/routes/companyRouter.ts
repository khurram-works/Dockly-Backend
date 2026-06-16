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
import { dashboardData } from "../controllers/dashBoardData";
import analyticsSummary from "../controllers/analyticsSummary";
import {conversations} from "../controllers/conversations"

const baseUrl = process.env.FRONTEND_URL

const companyRouter = Router();
companyRouter.use(authenticateToken);

companyRouter.get("/", dashboardData);

companyRouter.post("/documents", handleUpload, uploadDocument);
companyRouter.get("/documents", getDocuments);
companyRouter.post(
  "/:documentId/reprocess",
  reprocessDocument,
);
companyRouter.delete("/:documentId/delete", deleteDocument);
companyRouter.get("/analytics", analyticsSummary);
companyRouter.get("/conversations", conversations)

export default companyRouter;
