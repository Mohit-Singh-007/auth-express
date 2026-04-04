import { Router} from "express";
import { validate } from "../middlewares/validate";
import { registerSchema } from "../schema/authSchema";
import { register } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), register);

export default authRouter;