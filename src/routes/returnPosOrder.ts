import { Router } from "express";
import { returnPosOrderController } from "../controllers";

const router = Router();

router.post("/add", returnPosOrderController.addReturnPosOrder);
router.put("/edit", returnPosOrderController.editReturnPosOrder);
router.get("/all", returnPosOrderController.getAllReturnPosOrder);
router.get("/dropdown", returnPosOrderController.returnPosOrderDropDown);
router.delete("/:id", returnPosOrderController.deleteReturnPosOrder);
router.get("/:id", returnPosOrderController.getOneReturnPosOrder);

export { router as returnPosOrderRouter };
