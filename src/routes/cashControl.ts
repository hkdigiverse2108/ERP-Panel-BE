import { Router } from "express";
import { cashControlController } from "../controllers";

const router = Router();

router.post("/add", cashControlController.addCashControl);
router.put("/edit", cashControlController.editCashControl);
router.get("/all", cashControlController.getAllCashControl);
router.get("/dropdown", cashControlController.cashControlDropDown);
router.get("/:id", cashControlController.getOneCashControl);
router.delete("/:id", cashControlController.deleteCashControl);

export default router;
