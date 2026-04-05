import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

declare global{
    namespace Express {
        interface Request {
            user?: {
                userId: string,
                email: string,
                role: string
            }
        }
    }
}

export const verifyToken = async(req: Request,res: Response,next: NextFunction) => {

    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        throw new ApiError(401,"No token provided")
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded; 
        next();
    } catch {
        throw new ApiError(401,"Invalid token");
    }
}