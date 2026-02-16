import express from "express";
import { loyaltyPointsController } from "../controllers";

const router = express.Router();

router.get("/", loyaltyPointsController.getLoyaltyPoints);
router.post("/", loyaltyPointsController.addOrUpdateLoyaltyPoints);

export const loyaltyPointsRouter = router;
