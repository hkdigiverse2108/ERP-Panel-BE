import { Router } from "express";
import { journalVoucherController } from "../controllers";

const router = Router();

router.post("/add", journalVoucherController.createJournalVoucher);
router.put("/edit", journalVoucherController.updateJournalVoucher);
router.delete("/:id", journalVoucherController.deleteJournalVoucher);
router.get("/all", journalVoucherController.getAllJournalVoucher);
router.get("/:id", journalVoucherController.getOneJournalVoucher);

export const journalVoucherRouter = router;
