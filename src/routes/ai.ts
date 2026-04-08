import { Router } from "express";
import { aiController } from "../controllers";

const router = Router();

router.post("/analyze", aiController.analyzeTable);

export const aiRouter = router;
