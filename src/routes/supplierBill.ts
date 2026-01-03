import express from "express";
import { supplierBillController } from "../controllers";

const router = express.Router();

router.get("/all", supplierBillController.getAllSupplierBill);
router.get("/dropdown", supplierBillController.getSupplierBillDropdown);
router.post("/add", supplierBillController.addSupplierBill);
router.put("/edit", supplierBillController.editSupplierBill);
router.delete("/:id", supplierBillController.deleteSupplierBill);
router.get("/:id", supplierBillController.getOneSupplierBill);

export const supplierBillRouter = router;

