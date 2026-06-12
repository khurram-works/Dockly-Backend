import { prisma } from "../../lib/prisma";
import e from "express";
import { Router } from "express";
import { getChatbotInfo, sendChatMessage } from "../controllers/chatController";

const publicRouter = Router();

publicRouter.get("/:slug", getChatbotInfo);

publicRouter.post("/message", sendChatMessage)

export default publicRouter;
