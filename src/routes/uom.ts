import express from "express";
import { uomController } from "../controllers";

const router = express.Router();

router.post("/add", uomController.addUOM);
router.put("/edit", uomController.editUOM);
router.delete("/:id", uomController.deleteUOM);
router.get("/all", uomController.getAllUOM);
router.get("/dropdown", uomController.getUOMDropdown);
router.get("/:id", uomController.getUOMById);

export const uomRouter = router;

