import express from "express";
import { paymentTermController } from "../controllers";

const router = express.Router();

router.get("/all", paymentTermController.getAllPaymentTerm);
router.get("/dropdown", paymentTermController.getPaymentTermDropdown);

export const paymentTermRouter = router;

