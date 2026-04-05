import { Router} from "express";
import { validate } from "../middlewares/validate";
import { forgotPasswordSchema, loginSchema, registerSchema, verifyEmailSchema } from "../schema/authSchema";
import { login, logout, refresh, register, resendVerification, verifyEmailHandler } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/verify-email', validate(verifyEmailSchema), verifyEmailHandler);
authRouter.post('/resend-verification', validate(forgotPasswordSchema), resendVerification);
authRouter.post("/refresh",refresh);
authRouter.post('/logout', logout);

export default authRouter;