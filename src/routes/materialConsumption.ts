import { Router } from "express";
import { materialConsumptionController } from "../controllers";

const router = Router();

router.get("/all", materialConsumptionController.getAllMaterialConsumption);
router.post("/add", materialConsumptionController.addMaterialConsumption);
router.put("/edit", materialConsumptionController.editMaterialConsumption);
router.delete("/:id", materialConsumptionController.deleteMaterialConsumption);
router.get("/:id", materialConsumptionController.getMaterialConsumptionById);

export const materialConsumptionRouter = router;
