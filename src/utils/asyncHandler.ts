// try-catch ki jgh

import { NextFunction, Request, Response } from "express";

type AsyncFnc = (req: Request,res: Response,next:NextFunction) => Promise<void>;
export const asyncHandler = (fn: AsyncFnc) => (req: Request,res: Response,next:NextFunction) =>{
 fn(req,res,next).catch(next);
}
