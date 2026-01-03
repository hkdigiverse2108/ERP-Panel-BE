import { Router } from "express";
import { bankController } from "../controllers";

const router = Router();

router.get("/all", bankController.getAllBank);
router.get("/dropdown", bankController.getBankDropdown);
router.post("/add", bankController.addBank);
router.put("/edit", bankController.editBank);
router.delete("/:id", bankController.deleteBankById);
router.get("/:id", bankController.getBankById);

export const bankRouter = router;
