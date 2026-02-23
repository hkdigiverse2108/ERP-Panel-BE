import { Router } from "express";
import { authController } from "../controllers";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);

export const authRoute = router;
