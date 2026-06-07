import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter  from "./src/routes/authRouter"
import companyRouter from "./src/routes/companyRouter";


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



app.listen(PORT, ()=>{
  console.log(`Server running on http://localhost:${PORT}`);
})
