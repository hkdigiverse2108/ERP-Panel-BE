import express from "express";
import { salesCreditNoteController } from "../controllers";

const router = express.Router();

router.get("/all", salesCreditNoteController.getAllSalesCreditNote);
router.post("/add", salesCreditNoteController.addSalesCreditNote);
router.put("/edit", salesCreditNoteController.editSalesCreditNote);
router.delete("/:id", salesCreditNoteController.deleteSalesCreditNote);
router.get("/:id", salesCreditNoteController.getOneSalesCreditNote);

export const salesCreditNoteRouter = router;
