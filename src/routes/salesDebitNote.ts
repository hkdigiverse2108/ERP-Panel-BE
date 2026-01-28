import express from "express";
import { salesDebitNoteController } from "../controllers";

const router = express.Router();

router.get("/all", salesDebitNoteController.getAllSalesDebitNote);
router.post("/add", salesDebitNoteController.addSalesDebitNote);
router.put("/edit", salesDebitNoteController.editSalesDebitNote);
router.delete("/:id", salesDebitNoteController.deleteSalesDebitNote);
router.get("/:id", salesDebitNoteController.getOneSalesDebitNote);

export const salesDebitNoteRouter = router;
