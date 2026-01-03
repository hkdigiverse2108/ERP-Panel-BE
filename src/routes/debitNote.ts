import express from "express";
import { debitNoteController } from "../controllers";

const router = express.Router();

router.get("/all", debitNoteController.getAllDebitNote);
router.post("/add", debitNoteController.addDebitNote);
router.put("/edit", debitNoteController.editDebitNote);
router.delete("/:id", debitNoteController.deleteDebitNote);
router.get("/:id", debitNoteController.getOneDebitNote);

export const debitNoteRouter = router;

