import express from "express";
import { branchController } from "../controllers";

const router = express.Router();
router.get("/all", branchController.getAllBranch);
router.post("/add", branchController.addBranch);
router.put("/edit", branchController.editBranchById);
router.delete("/:id", branchController.deleteBranchById);
router.get("/:id", branchController.getBranchById);

export const branchRouter = router;
