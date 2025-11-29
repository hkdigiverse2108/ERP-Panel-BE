import { Router } from "express";
import { Login, Register } from "../controllers";

const router = Router();

router.post("/register", Register);
router.post("/login", Login);

export const AuthRouter = router;
