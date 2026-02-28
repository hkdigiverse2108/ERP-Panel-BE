import express from "express";
import { posOrderController } from "../controllers";

const router = express.Router();

router.get("/all", posOrderController.getAllPosOrder);
router.get("/hold", posOrderController.getAllHoldOrders);
router.get("/dropdown", posOrderController.posOrderDropDown);
router.post("/add", posOrderController.addPosOrder);
router.put("/edit", posOrderController.editPosOrder);

router.get("/customer/:id", posOrderController.getCustomerPosDetails);
router.put("/release", posOrderController.releasePosOrder);
router.get("/cash-control", posOrderController.getPosCashControl);
router.put("/cash-control", posOrderController.updatePosCashControl);
router.get("/payments", posOrderController.getCombinedPayments);

router.delete("/:id", posOrderController.deletePosOrder);
router.get("/:id", posOrderController.getOnePosOrder);

// router.put("/hold", posOrderController.holdPosOrder);
// router.get("/customer-loyalty", posOrderController.getCustomerLoyaltyPoints);
// router.post("/redeem-loyalty", posOrderController.redeemLoyaltyPoints);
// router.post("/quick-add-product", posOrderController.quickAddProduct);
// router.put("/convert-to-invoice", posOrderController.convertToInvoice);

export const posOrderRouter = router;
