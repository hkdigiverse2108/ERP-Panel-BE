import { Router } from "express";
import * as consumptionTypeController from "../controllers/consumptionType";

const router = Router();

router.post("/add", consumptionTypeController.addConsumptionType);
router.put("/edit", consumptionTypeController.editConsumptionType);
router.get("/all", consumptionTypeController.getAllConsumptionType);
router.get("/dropdown", consumptionTypeController.consumptionTypeDropDown);
router.delete("/:id", consumptionTypeController.deleteConsumptionType);
router.get("/:id", consumptionTypeController.getOneConsumptionType);

export { router as consumptionTypeRouter };
