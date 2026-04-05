import { Router} from "express";
import { validate } from "../middlewares/validateSchema.middleware";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "../schema/authSchema";
import { forgotPasswordController, loginController, logoutController, refreshTokenController, registerController, resendVerificationController, resetPasswordController, verifyEmailController } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), registerController);
authRouter.post('/login', validate(loginSchema), loginController);
authRouter.post('/verify-email', validate(verifyEmailSchema), verifyEmailController);
authRouter.post('/resend-verification', validate(forgotPasswordSchema), resendVerificationController);
authRouter.post("/refresh",refreshTokenController);
authRouter.post('/logout', logoutController);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordController);
authRouter.post('/reset-password', validate(resetPasswordSchema), resetPasswordController);

export default authRouter;