import { Router } from "express";
import { specialController } from "../controllers";

const router = Router();

router.post("/add", specialController.addSpecial);
router.put("/edit", specialController.editSpecialById);
router.delete("/:id", specialController.deleteSpecialById);
router.get("/all", specialController.getAllSpecial);

export const specialRouter = router;
