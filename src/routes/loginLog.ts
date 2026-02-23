import express from "express";
import { loginLogController } from "../controllers";

const router = express.Router();

router.get("/all", loginLogController.getAllLoginLog);

export const loginLogRouter = router;