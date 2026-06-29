import express from "express";
import { posOrderController } from "../controllers";

const router = express.Router();

router.get("/all", posOrderController.getAllPosOrder);
router.get("/hold", posOrderController.getShortHoldOrders);
router.get("/dropdown", posOrderController.posOrderDropDown);
router.post("/add", posOrderController.addPosOrder);
router.put("/edit", posOrderController.editPosOrder);

router.get("/customer/:id", posOrderController.getCustomerPosDetails);
router.put("/release", posOrderController.releasePosOrder);
router.get("/festival-analytics", posOrderController.festivalAnalytics);

router.delete("/:id", posOrderController.deletePosOrder);
router.get("/:id", posOrderController.getOnePosOrder);

export const posOrderRouter = router;
