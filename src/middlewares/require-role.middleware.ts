import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

export const requireRole = (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) =>{

    if(!req.user){
        throw new ApiError(401,"Not authenticated...")
    }

    if(!roles.includes(req.user.role)){
        throw new ApiError(403, 'Insufficient permissions...');
    }

    next();

  }