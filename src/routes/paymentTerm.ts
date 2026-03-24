import express from "express";
import { paymentTermsController } from "../controllers";

const router = express.Router();

router.get("/all", paymentTermsController.getAllPaymentTerm);
router.post("/add", paymentTermsController.addPaymentTerm);
router.put("/edit", paymentTermsController.editPaymentTerm);
router.delete("/:id", paymentTermsController.deletePaymentTermById);
router.get("/:id", paymentTermsController.getPaymentTermById);

router.get("/dropdown", paymentTermsController.getPaymentTermDropdown);

export const paymentTermRouter = router;
