import "dotenv/config";
import './config/mailer';
import express, { Request, Response } from "express"
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";
import { errorHandler } from "./middlewares/globalError.middleware";
import { prisma } from "./config/prisma";
import { verifyToken } from "./middlewares/verifyToken.middleware";
import { requireRole } from "./middlewares/requireRole.middleware";
import { redis } from "./config/redis";
import { generalLimiter } from "./middlewares/RateLimiter.middleware";



const app = express();
app.use(express.json());
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  hidePoweredBy: true,       // removes X-Powered-By: Express header
  hsts: true,                // forces HTTPS
  noSniff: true,             // prevents MIME sniffing
  xssFilter: true,           // basic XSS protection header
}));

app.use(cors({origin: env.CLIENT_URL , credentials: true}))
app.use(cookieParser());

app.use(generalLimiter) // general rate limiting

app.use("/api/auth", authRouter);


app.get("/health",(_req: Request,res: Response)=>{
    res.json({status: 'ok'});
});


// test protected routes
app.get("/api/me",verifyToken,(req,res)=>{
  res.json({user: req.user})
})

// admin only
app.get("/api/admin",verifyToken,requireRole("ADMIN"),(req, res) => {
  res.json({ message: 'Admin access granted', user: req.user })
})


// global error handler [spring boot -> GlobalExceptionHandler ] -> 2 ApiError , middleware
app.use(errorHandler);


async function main() {
  await redis.connect();
  await prisma.$connect();

  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on PORT: ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
