import express from "express";
import { salesOrderController } from "../controllers";

const router = express.Router();

router.get("/all", salesOrderController.getAllSalesOrder);
router.get("/dropdown", salesOrderController.getSalesOrderDropdown);
router.post("/add", salesOrderController.addSalesOrder);
router.put("/edit", salesOrderController.editSalesOrder);
router.delete("/:id", salesOrderController.deleteSalesOrder);
router.get("/:id", salesOrderController.getOneSalesOrder);

export const salesOrderRouter = router;

