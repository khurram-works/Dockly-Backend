import Router from "express";
import  handleRegister  from "../controllers/handleRegister";
import handleLogin from "../controllers/handleLogin"

const authRouter = Router();

authRouter.post("/register", handleRegister);
authRouter.post("/login", handleLogin);

export default authRouter;