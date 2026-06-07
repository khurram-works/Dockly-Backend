import Router from "express";
import handleRegister from "../controllers/handleRegister";
import handleLogin from "../controllers/handleLogin";
import handleLogout from "../controllers/handleLogout";
import handleRefresh from "../controllers/handleRefresh";
import handleSession from "../controllers/handleSession";
import { authenticateToken } from "../middleware/auth";

const authRouter = Router();

authRouter.post("/register", handleRegister);
authRouter.post("/login", handleLogin);
authRouter.post("/logout", handleLogout);
authRouter.post("/refresh", handleRefresh);
authRouter.get("/session", authenticateToken, handleSession);

export default authRouter;