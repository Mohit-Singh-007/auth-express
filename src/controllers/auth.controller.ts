import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { forgotPassword, loginUser, logoutUser, refreshToken, registerUser, resendVerificationEmail, resetPassword, verifyEmail } from "../services/auth.service";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "../utils/cookie";
import { ApiError } from "../utils/ApiError";
import {
  generate2FASecret,
  enable2FA,
  disable2FA,
  verify2FACode,
} from '../services/TwoFactor.service';
import { prisma } from "../config/prisma";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import { redis } from "../config/redis";

export const registerController = asyncHandler( async(req: Request,res: Response) =>{

    const user = await registerUser(req.body);

    res.status(201).json({
        message: "Registration successful. Please verify your email...",
        user
    })
})

export const loginController = asyncHandler(async(req: Request,res: Response) =>{
    const result = await loginUser(req.body,{
        ip: req.ip,
        userAgent: req.headers['user-agent']
    })

    // 2FA required , as no cookie yet from early return
    if(result.requiresTwoFactor){
        res.json({
            requireTwoFactor: true,
            tempToken: result.tempToken,
            message: "Enter 2FA code to continue..."
        })
        return;
    }

    // set refresh token to httpOnly cookie [normal login]
    setRefreshTokenCookie(res,result.refreshToken!);

    res.json({
        message:"Login successful...",
        accressToken: result.accessToken,
        user: result.user
    })
})

export const verifyEmailController = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const result = await verifyEmail(token);
  res.json(result);
});

export const resendVerificationController = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  await resendVerificationEmail(email);
  // always 200 — never reveal if email exists
  res.json({ message: 'If that email exists, a verification link has been sent.' });
});


export const refreshTokenController = asyncHandler(async (req: Request, res: Response) => {

    const incomingToken = req.cookies?.refreshToken;

    if (!incomingToken) {
      throw new ApiError(401, 'No refresh token');
    }

    const {newAccessToken,newRefreshToken}  = await refreshToken(incomingToken);

    // rotate -> set new refresh token
    setRefreshTokenCookie(res,newRefreshToken);

    res.json({
        message:"Token refreshed",
        accessToken: newAccessToken
    })
})


export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    clearRefreshTokenCookie(res);
    res.json({ message: 'Logged out successfully' }); 
});



export const forgotPasswordController = asyncHandler(async (req: Request, res: Response) =>{

    const {email} = req.body;
    await forgotPassword(email);
    res.json({message:"If that email exists , a password reset link has been sent"})
})

export const resetPasswordController =  asyncHandler(async (req: Request, res: Response) =>{

    const {token ,password} = req.body;
    const result = await resetPassword(token,password);
    res.json(result)
})





export const generate2FASecretHandler = asyncHandler(async (req: Request, res: Response) => {
  const { qrCode, secret } = await generate2FASecret(req.user!.userId);
  res.json({
    message: 'Scan this QR code with Google Authenticator',
    qrCode,
    secret, // backup — in case QR scan fails
  });
});

export const enable2FAHandler = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;
  const result = await enable2FA(req.user!.userId, code);
  res.json(result); // includes backup codes — shown ONCE
});

export const disable2FAHandler = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;
  const result = await disable2FA(req.user!.userId, code);
  res.json(result);
});

export const verify2FAHandler = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;
  const userId = req.user!.userId;

  await verify2FACode(userId, code);

  // 2FA passed — now issue real tokens
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const refreshTokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Promise.all([
    redis.setex(`refresh:${user.id}:${refreshTokenId}`, 7 * 24 * 60 * 60, refreshToken),
    prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    }),
  ]);

  setRefreshTokenCookie(res, refreshToken);
  res.json({
    message: 'Login successful',
    accessToken,
    user: { id: user.id, email: user.email, role: user.role },
  });
});