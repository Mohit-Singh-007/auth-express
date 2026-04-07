import { Router} from "express";
import { validate } from "../middlewares/validateSchema.middleware";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "../schema/authSchema";
import { forgotPasswordController, loginController, logoutController, refreshTokenController, registerController, resendVerificationController, resetPasswordController, verifyEmailController } from "../controllers/auth.controller";
import { authLimiter, passwordResetLimiter } from "../middlewares/RateLimiter.middleware";

import { verifyToken } from '../middlewares/verifyToken.middleware';
import { verifyTempToken } from '../middlewares/verifyTempToken.middleware';
import {
  generate2FASecretHandler,
  enable2FAHandler,
  disable2FAHandler,
  verify2FAHandler,
} from '../controllers/auth.controller'

const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerSchema), registerController);
authRouter.post('/login', authLimiter, validate(loginSchema), loginController);
authRouter.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmailController);
authRouter.post('/resend-verification', authLimiter, validate(forgotPasswordSchema), resendVerificationController);
authRouter.post("/refresh", authLimiter ,refreshTokenController);
authRouter.post('/logout', logoutController);
authRouter.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPasswordController);
authRouter.post('/reset-password', passwordResetLimiter,validate(resetPasswordSchema), resetPasswordController);


authRouter.get('/2fa/generate', verifyToken, generate2FASecretHandler);
authRouter.post('/2fa/enable', verifyToken, enable2FAHandler);
authRouter.post('/2fa/disable', verifyToken, disable2FAHandler);

// 2FA login step — requires temp token only
authRouter.post('/2fa/verify', verifyTempToken, verify2FAHandler);

export default authRouter;