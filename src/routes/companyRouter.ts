import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import e from "express";

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

export default companyRouter;
