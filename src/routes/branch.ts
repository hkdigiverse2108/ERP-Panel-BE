import express from "express";
import { branchController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = express.Router();

router.get("/all", branchController.getAllBranch);
router.get("/dropdown", branchController.getBranchDropdown);
router.get("/:id", branchController.getBranchById);

router.use(superAdminJwt);           
router.post("/add", branchController.addBranch);
router.put("/edit", branchController.editBranchById);
router.delete("/:id", branchController.deleteBranchById);

export const branchRouter = router;
