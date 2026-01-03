import express from "express";
import { accountGroupController } from "../controllers";

const router = express.Router();

router.get("/all", accountGroupController.getAllAccountGroup);
router.get("/dropdown", accountGroupController.getAccountGroupDropdown);
// For backward compatibility with existing frontend
router.post("/list/json", accountGroupController.getAccountGroupDropdown);

export const accountGroupRouter = router;

