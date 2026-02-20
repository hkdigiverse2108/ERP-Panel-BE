import { Router } from "express";
import { returnPosOrderController } from "../controllers";

const router = Router();

router.post("/add", returnPosOrderController.addReturnPosOrder);
router.post("/edit", returnPosOrderController.editReturnPosOrder);
router.delete("/delete/:id", returnPosOrderController.deleteReturnPosOrder);
router.get("/all", returnPosOrderController.getAllReturnPosOrder);
router.get("/:id", returnPosOrderController.getOneReturnPosOrder);
router.get("/dropdown", returnPosOrderController.returnPosOrderDropDown);
router.get("/credit-notes", returnPosOrderController.getCreditNotes);

export { router as returnPosOrderRouter };
