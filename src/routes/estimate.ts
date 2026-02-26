import express from "express";
import { estimateController } from "../controllers";

const router = express.Router();

router.get("/all", estimateController.getAllEstimate);
router.get("/dropdown", estimateController.getEstimateDropdown);
router.post("/add", estimateController.addEstimate);
router.put("/edit", estimateController.editEstimate);
router.delete("/:id", estimateController.deleteEstimate);
router.get("/:id", estimateController.getOneEstimate);

export const estimateRouter = router;

