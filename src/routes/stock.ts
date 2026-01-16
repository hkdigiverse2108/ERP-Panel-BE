import { Router } from "express";
import { stockController } from "../controllers";

const router = Router();

router.post("/add", stockController.addStock);
router.put("/edit", stockController.editStock);
router.put("/bulk-adjustment", stockController.bulkStockAdjustment);
router.delete("/:id", stockController.deleteStock);
router.get("/all", stockController.getAllStock);
router.get("/:id", stockController.getOneStock);

export const stockRoute = router;
