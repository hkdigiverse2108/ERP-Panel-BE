import { Router } from "express";
import { authController } from "../controllers";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

export const authRoute = router;
