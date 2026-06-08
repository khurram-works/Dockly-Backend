import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import e from "express";
import { uploadDocument, getDocuments } from "../controllers/handleDocumentUpload";
import { handleUpload } from "../middleware/upload_middleware";

const companyRouter = Router();
companyRouter.use(authenticateToken);


companyRouter.get('/', (req: e.Request, res:e.Response)=>{

  try{

    return res.status(201).json({
      success: true,
      message: "Successfully Retrieved Dashboard Data"
    })

  }catch(err){
    console.log(err)
  }

})

companyRouter.post("/documents", handleUpload, uploadDocument)
companyRouter.get("/documents", getDocuments)

export default companyRouter;
