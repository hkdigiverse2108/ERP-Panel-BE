import { Router } from "express";
import * as consumptionTypeController from "../controllers/consumptionType";

const router = Router();

router.post("/add", consumptionTypeController.addConsumptionType);
router.post("/edit", consumptionTypeController.editConsumptionType);
router.delete("/delete/:id", consumptionTypeController.deleteConsumptionType);
router.get("/get-one/:id", consumptionTypeController.getOneConsumptionType);
router.get("/get-all", consumptionTypeController.getAllConsumptionType);
router.get("/dropdown", consumptionTypeController.consumptionTypeDropDown);

export { router as consumptionTypeRouter };
