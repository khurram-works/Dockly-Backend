import { success } from "zod";
import {prisma} from "../../lib/prisma"
import e from "express"


export async function companyDetail(req:e.Request, res:e.Response){
  try{
    const {id} = req.params
    if (typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid CompanyId",
      });
    }

    const company = await prisma.company.findUnique({
      where:{
        id: id
      }
    })

    return res.status(200).json({
      success: true,
      company
    })

  }catch(err){
    console.log(err)
    return res.status(500).json({
      success: false,
      message: "Failed fetching company details"
    })
  }
}