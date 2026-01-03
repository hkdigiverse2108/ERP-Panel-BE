import express from "express";
import { discountController } from "../controllers";

const router = express.Router();

router.get("/all", discountController.getAllDiscount);
router.post("/add", discountController.addDiscount);
router.put("/edit", discountController.editDiscount);
router.delete("/:id", discountController.deleteDiscount);
router.get("/:id", discountController.getOneDiscount);

export const discountRouter = router;

