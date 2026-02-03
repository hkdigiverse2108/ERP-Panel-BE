import { Router } from "express";
import { payLaterController } from "../controllers";

const router = Router();

router.post("/add", payLaterController.addPayLater);
router.put("/edit", payLaterController.editPayLater);
router.get("/all", payLaterController.getAllPayLater);
router.get("/:id", payLaterController.getOnePayLater);
router.delete("/:id", payLaterController.deletePayLater);

export const payLaterRouter = router;
