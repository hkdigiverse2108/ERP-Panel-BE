import { Router } from "express";
import { authController } from "../controllers";

const router = Router();

console.log("authRoute");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/reset-password", authController.resetPassword);

export const authRoute = router;
