import { Router } from "express";
import { materialController } from "../controllers";

const router = Router();

router.get("/all", materialController.getAllMaterial);
router.post("/add", materialController.addMaterial);
router.put("/edit", materialController.editMaterial);
router.delete("/:id", materialController.deleteMaterial);
router.get("/:id", materialController.getMaterialById);

export const materialRouter = router;
