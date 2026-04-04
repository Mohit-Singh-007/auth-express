import "dotenv/config";
import express, { Request, Response } from "express"
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import cookieParser from "cookie-parser";



const app = express();
app.use(express.json());


app.use(helmet());
app.use(cors({origin: env.CLIENT_URL , credentials: true}))
app.use(cookieParser());


app.get("/health",(_req: Request,res: Response)=>{
    res.json({status: 'ok'});
});

app.listen(env.PORT,()=>{
    console.log(`Server running on PORT: ${env.PORT}`);
})