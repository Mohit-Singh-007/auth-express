import "dotenv/config";
import express, { Request, Response } from "express"
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";



const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors({origin: env.CLIENT_URL , credentials: true}))
app.use(cookieParser());


app.use("/api/auth", authRouter);


app.get("/health",(_req: Request,res: Response)=>{
    res.json({status: 'ok'});
});

// global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message === 'EMAIL_TAKEN') {
    res.status(409).json({ message: 'Email already in use' });
    return;
  }
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(env.PORT,()=>{
    console.log(`Server running on PORT: ${env.PORT}`);
})