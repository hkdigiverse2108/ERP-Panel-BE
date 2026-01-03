import express from "express";
import { creditNoteController } from "../controllers";

const router = express.Router();

router.get("/all", creditNoteController.getAllCreditNote);
router.post("/add", creditNoteController.addCreditNote);
router.put("/edit", creditNoteController.editCreditNote);
router.delete("/:id", creditNoteController.deleteCreditNote);
router.get("/:id", creditNoteController.getOneCreditNote);

export const creditNoteRouter = router;

