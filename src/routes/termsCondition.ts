import express from "express";
import { termsConditionController } from "../controllers";

const router = express.Router();

router.post("/add", termsConditionController.addTermsCondition);
router.put("/edit", termsConditionController.editTermsCondition);
router.delete("/:id", termsConditionController.deleteTermsCondition);
router.get("/all", termsConditionController.getAllTermsCondition);
router.get("/dropdown", termsConditionController.getTermsConditionDropdown);
router.get("/:id", termsConditionController.getTermsConditionById);

export const termsConditionRouter = router;
