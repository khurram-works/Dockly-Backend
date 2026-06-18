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
import {conversations} from "../controllers/conversations";
import { conversationDetail } from "../controllers/conversationDetail";
import { companyDetail } from "../controllers/companyDetails";
import { updatePassword } from "../controllers/updatePassword";
import { updateProfile } from "../controllers/updateProfile";


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
companyRouter.get("/conversations", conversations);
companyRouter.get("/conversations/:id", conversationDetail);
companyRouter.get("/profile/:id", companyDetail);
companyRouter.patch("/profile/update", updateProfile);
companyRouter.patch("/profile/password", updatePassword);

export default companyRouter;
