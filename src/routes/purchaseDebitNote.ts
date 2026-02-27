import express from "express";
import { purchaseDebitNoteController } from "../controllers";

const router = express.Router();

router.get("/all", purchaseDebitNoteController.getAllpurchaseDebitNote);
router.post("/add", purchaseDebitNoteController.addpurchaseDebitNote);
router.put("/edit", purchaseDebitNoteController.editpurchaseDebitNote);
router.delete("/:id", purchaseDebitNoteController.deletepurchaseDebitNote);
router.get("/:id", purchaseDebitNoteController.getOnepurchaseDebitNote);

export const purchaseDebitNoteRouter = router;
