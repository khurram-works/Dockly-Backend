import e from "express";
import {prisma} from "../../lib/prisma";
import { success } from "zod";

export async function docDetails(req: e.Request, res:e.Response){
  const limit = 4
  try{
    const {id} = req.params
    if(typeof id !== "string"){
      return res.status(400).json({
        success: false,
        message: "Invalid docId"
      })

    }

    const document = await prisma.document.findUnique({
      where:{
        id: id
      }
    })

   


    return res.status(200).json({
      success: true,
      document,
    }
    )

  }catch(err){
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload the Docs'
    })
  }
}