import express from "express";
import { voucherController } from "../controllers";

const router = express.Router();

// Generic voucher routes
router.get("/all", voucherController.getAllVoucher);
router.post("/add", voucherController.addVoucher);
router.put("/edit", voucherController.editVoucher);
router.delete("/:id", voucherController.deleteVoucher);
router.get("/:id", voucherController.getOneVoucher);

// Specific type routes (convenience endpoints)
router.post("/payment/add", voucherController.addPayment);
router.get("/payment/all", voucherController.getAllPayment);

router.post("/receipt/add", voucherController.addReceipt);
router.get("/receipt/all", voucherController.getAllReceipt);

router.post("/expense/add", voucherController.addExpense);
router.get("/expense/all", voucherController.getAllExpense);

export const voucherRouter = router;

