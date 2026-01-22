import express from "express";
import { accountGroupController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = express.Router();

router.get("/all", accountGroupController.getAllAccountGroup);
router.get("/dropdown", accountGroupController.getAccountGroupDropdown);
router.get("/tree", accountGroupController.getAccountGroupTree);
router.get("/:id", accountGroupController.getOneAccountGroup);

router.use(superAdminJwt);
router.post("/add", accountGroupController.addAccountGroup);
router.put("/edit", accountGroupController.editAccountGroup);
router.delete("/:id", accountGroupController.deleteAccountGroup);
// For backward compatibility with existing frontend
router.post("/list/json", accountGroupController.getAccountGroupDropdown);

export const accountGroupRouter = router;
