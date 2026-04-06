import { Router} from "express";
import { validate } from "../middlewares/validateSchema.middleware";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "../schema/authSchema";
import { forgotPasswordController, loginController, logoutController, refreshTokenController, registerController, resendVerificationController, resetPasswordController, verifyEmailController } from "../controllers/auth.controller";
import { authLimiter, passwordResetLimiter } from "../middlewares/RateLimiter.middleware";

const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerSchema), registerController);
authRouter.post('/login', authLimiter, validate(loginSchema), loginController);
authRouter.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmailController);
authRouter.post('/resend-verification', authLimiter, validate(forgotPasswordSchema), resendVerificationController);
authRouter.post("/refresh", authLimiter ,refreshTokenController);
authRouter.post('/logout', logoutController);
authRouter.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPasswordController);
authRouter.post('/reset-password', passwordResetLimiter,validate(resetPasswordSchema), resetPasswordController);

export default authRouter;