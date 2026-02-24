import { Router } from "express";
import { stockVerificationController } from "../controllers";

const router = Router();

router.get("/all", stockVerificationController.getAllStockVerification);
router.post("/add", stockVerificationController.addStockVerification);
router.put("/edit", stockVerificationController.editStockVerification);
router.delete("/:id", stockVerificationController.deleteStockVerification);
router.get("/:id", stockVerificationController.getOneStockVerification);

export const stockVerificationRouter = router;

