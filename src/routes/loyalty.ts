import express from "express";
import { loyaltyController } from "../controllers";

const router = express.Router();

router.get("/all", loyaltyController.getAllLoyalty);
router.post("/add", loyaltyController.addLoyalty);
router.post("/redeem", loyaltyController.redeemLoyalty);
router.post("/remove", loyaltyController.removeLoyalty);
router.put("/edit", loyaltyController.editLoyalty);
router.delete("/:id", loyaltyController.deleteLoyalty);
router.get("/:id", loyaltyController.getOneLoyalty);

export const loyaltyRouter = router;
