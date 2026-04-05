import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { forgotPassword, loginUser, logoutUser, refreshToken, registerUser, resendVerificationEmail, resetPassword, verifyEmail } from "../services/auth.service";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "../utils/cookie";
import { ApiError } from "../utils/ApiError";

export const registerController = asyncHandler( async(req: Request,res: Response) =>{

    const user = await registerUser(req.body);

    res.status(201).json({
        message: "Registration successful. Please verify your email...",
        user
    })
})

export const loginController = asyncHandler(async(req: Request,res: Response) =>{
    const {accessToken,refreshToken,user} = await loginUser(req.body,{
        ip: req.ip,
        userAgent: req.headers['user-agent']
    })

    // set refresh token to httpOnly cookie
    setRefreshTokenCookie(res,refreshToken);

    res.json({
        message:"Login successful...",
        accessToken,
        user
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
})


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