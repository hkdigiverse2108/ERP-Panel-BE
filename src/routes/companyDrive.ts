import { Router } from "express";
import { companyDriveController } from "../controllers";

const router = Router();

router.post("/add", companyDriveController.addCompanyDrive);
router.get("/all", companyDriveController.getCompanyDrives);
router.get("/:id", companyDriveController.getCompanyDriveById);
router.put("/update", companyDriveController.updateCompanyDrive);
router.delete("/:id", companyDriveController.deleteCompanyDrive);

export const companyDriveRouter = router;
