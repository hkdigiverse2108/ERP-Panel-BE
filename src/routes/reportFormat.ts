import { Router } from "express";
import { reportFormatController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = Router();

router.get("/all", reportFormatController.getAllReportFormats);
router.get("/get-branch-config", reportFormatController.getBranchReportConfig);

router.use(superAdminJwt);

router.post("/add", reportFormatController.addReportFormat);
router.delete("/:id", reportFormatController.deleteReportFormat);

export const reportFormatRouter = router;
