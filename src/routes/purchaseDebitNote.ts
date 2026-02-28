import express from "express";
import { purchaseDebitNoteController } from "../controllers";

const router = express.Router();

router.get("/all", purchaseDebitNoteController.getAllPurchaseDebitNote);
router.get(
  "/dropdown",
  purchaseDebitNoteController.getPurchaseDebitNoteDropdown,
);
router.post("/add", purchaseDebitNoteController.addPurchaseDebitNote);
router.put("/edit", purchaseDebitNoteController.editPurchaseDebitNote);
router.delete("/:id", purchaseDebitNoteController.deletePurchaseDebitNote);
router.get("/:id", purchaseDebitNoteController.getOnePurchaseDebitNote);

export const purchaseDebitNoteRouter = router;
