import express from "express";
import { deliveryChallanController } from "../controllers";

const router = express.Router();

router.get("/all", deliveryChallanController.getAllDeliveryChallan);
router.post("/add", deliveryChallanController.addDeliveryChallan);
router.put("/edit", deliveryChallanController.editDeliveryChallan);
router.delete("/:id", deliveryChallanController.deleteDeliveryChallan);
router.get("/:id", deliveryChallanController.getOneDeliveryChallan);

export const deliveryChallanRouter = router;

