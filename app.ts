import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter  from "./src/routes/authRouter"
import companyRouter from "./src/routes/companyRouter";
import { processStuckDocuments } from "./src/jobs/startup_job";
import publicRouter from "./src/routes/publicRouter";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true}));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/", authRouter);
app.use("/dashboard", companyRouter);
app.use("/chat", publicRouter);



app.listen(PORT, ()=>{
  console.log(`Server running on http://localhost:${PORT}`);
  setTimeout(async () => {
    console.log("Checking for stuck documents...");
    await processStuckDocuments();
  }, 3000);
})
