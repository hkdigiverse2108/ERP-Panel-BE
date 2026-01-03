import express from "express";
import { purchaseOrderController } from "../controllers";

const router = express.Router();

router.get("/all", purchaseOrderController.getAllPurchaseOrder);
router.get("/dropdown", purchaseOrderController.getPurchaseOrderDropdown);
router.post("/add", purchaseOrderController.addPurchaseOrder);
router.put("/edit", purchaseOrderController.editPurchaseOrder);
router.delete("/:id", purchaseOrderController.deletePurchaseOrder);
router.get("/:id", purchaseOrderController.getOnePurchaseOrder);

export const purchaseOrderRouter = router;

