import { NextFunction, Request, Response } from "express";
import z, { ZodSchema} from "zod";


export const validate = (schema: ZodSchema) =>
     (req: Request,res: Response,next: NextFunction)=>{

        const result = schema.safeParse({
            body: req.body,
            params: req.params,
            cookies: req.cookies,
            query: req.query
        })

        if(!result.success){
            const errors = result.error.issues.map((e) => ({
                field: e.path.slice(1).join("."),
                message: e.message
            }))

            res.status(400).json({
                message: "Validation failed",
                errors
            })
            return;
        }


        const data = result.data as any;
        req.body = data.body ?? req.body;

        next();

}