import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { registerUser } from "../services/auth.service";

export const register = asyncHandler( async(req: Request,res: Response) =>{

    const user = await registerUser(req.body);

    res.status(201).json({
        message: "Registration successful. Please verify your email...",
        user
    })
})