import express from "express";
import { invoiceController } from "../controllers";

const router = express.Router();

router.get("/all", invoiceController.getAllInvoice);
router.get("/dropdown", invoiceController.getInvoiceDropdown);
router.post("/add", invoiceController.addInvoice);
router.put("/edit", invoiceController.editInvoice);
router.delete("/:id", invoiceController.deleteInvoice);
router.get("/:id", invoiceController.getOneInvoice);

export const invoiceRouter = router;

