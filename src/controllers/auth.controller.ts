import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { loginUser, logoutUser, refreshToken, registerUser, resendVerificationEmail, verifyEmail } from "../services/auth.service";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "../utils/cookie";
import { ApiError } from "../utils/ApiError";

export const register = asyncHandler( async(req: Request,res: Response) =>{

    const user = await registerUser(req.body);

    res.status(201).json({
        message: "Registration successful. Please verify your email...",
        user
    })
})

export const login = asyncHandler(async(req: Request,res: Response) =>{
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

export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const result = await verifyEmail(token);
  res.json(result);
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  await resendVerificationEmail(email);
  // always 200 — never reveal if email exists
  res.json({ message: 'If that email exists, a verification link has been sent.' });
});


export const refresh = asyncHandler(async (req: Request, res: Response) => {

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


export const logout = asyncHandler(async (req: Request, res: Response) => {
  
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    clearRefreshTokenCookie(res);
})
