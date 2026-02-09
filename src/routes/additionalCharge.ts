import express from "express";
import { additionalChargeController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = express.Router();

router.get("/all", additionalChargeController.getAllAdditionalCharge);
router.get("/dropdown", additionalChargeController.getAdditionalChargeDropdown);
router.get("/:id", additionalChargeController.getAdditionalChargeById);

router.post("/add", additionalChargeController.addAdditionalCharge);
router.put("/edit", additionalChargeController.editAdditionalChargeById);
router.delete("/:id", additionalChargeController.deleteAdditionalChargeById);

export const additionalChargeRouter = router;
