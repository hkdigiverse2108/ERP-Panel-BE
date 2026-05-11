import { Router } from "express";
import { stockTransferController } from "../controllers";

const router = Router();

router.post("/request", stockTransferController.requestStockTransfer);
router.post("/approve", stockTransferController.approveStockTransfer);
router.post("/dispatch", stockTransferController.dispatchStockTransfer);
router.post("/confirm-receipt", stockTransferController.confirmReceiptStockTransfer);
router.post("/reject", stockTransferController.rejectStockTransfer);
// router.post("/cancel", stockTransferController.cancelStockTransfer);
router.put("/edit", stockTransferController.editStockTransfer);

router.get("/all", stockTransferController.getAllStockTransfer);
router.get("/:id", stockTransferController.getStockTransferById);

router.delete("/:id", stockTransferController.deleteStockTransfer);

export const stockTransferRouter = router;
