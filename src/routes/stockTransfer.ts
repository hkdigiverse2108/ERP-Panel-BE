import { Router } from "express";
import { requestStockTransfer, approveStockTransfer, confirmReceiptStockTransfer, rejectStockTransfer, cancelStockTransfer, getAllStockTransfer, getStockTransferById, deleteStockTransfer } from "../controllers/stockTransfer";

const router = Router();

router.post("/request", requestStockTransfer);
router.post("/approve", approveStockTransfer);
router.post("/confirm-receipt", confirmReceiptStockTransfer);
router.post("/reject", rejectStockTransfer);
router.post("/cancel", cancelStockTransfer);

router.get("/all", getAllStockTransfer);
router.get("/:id", getStockTransferById);

router.delete("/:id", deleteStockTransfer);

export const stockTransferRouter = router;
