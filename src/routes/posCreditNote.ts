import { Router } from "express";
import { posCreditNoteController } from "../controllers";
import { adminJwt } from "../helper";

const router = Router();

router.get("/all", adminJwt, posCreditNoteController.getAllPosCreditNote);
router.get("/:id", adminJwt, posCreditNoteController.getOnePosCreditNote);
router.delete("/:id", adminJwt, posCreditNoteController.deletePosCreditNote);

export const posCreditNoteRouter = router;
