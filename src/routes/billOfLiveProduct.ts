import express from "express";
import { billOfLiveProductController } from "../controllers";

const router = express.Router();

router.get("/all", billOfLiveProductController.getAllBillOfLiveProduct);
router.get("/dropdown", billOfLiveProductController.getBillOfLiveProductDropdown);
router.post("/add", billOfLiveProductController.addBillOfLiveProduct);
router.put("/edit", billOfLiveProductController.editBillOfLiveProductById);
router.delete("/:id", billOfLiveProductController.deleteBillOfLiveProductById);
router.get("/:id", billOfLiveProductController.getBillOfLiveProductById);

export const billOfLiveProductRouter = router;
