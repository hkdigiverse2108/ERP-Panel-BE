import { Router } from "express";
import { posCreditNoteController } from "../controllers";

const router = Router();

router.get("/all", posCreditNoteController.getAllPosCreditNote);
router.post("/redeem", posCreditNoteController.checkRedeemCredit);
router.post("/refund", posCreditNoteController.refundPosCredit);
router.get("/redeem-dropdown", posCreditNoteController.getCreditNoteRedeemDropdown);
router.delete("/:id", posCreditNoteController.deletePosCreditNote);
router.get("/:id", posCreditNoteController.getOnePosCreditNote);

export const posCreditNoteRouter = router;
