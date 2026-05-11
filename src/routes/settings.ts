import { Router } from "express";
import { settingsController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = Router();

router.get("/all", settingsController.getSettings);
router.get("/report-format/all", settingsController.getAllReportFormats);

router.use(superAdminJwt);

router.put("/update", settingsController.updateSettings);

router.post("/report-format/add", settingsController.addReportFormat);
router.put("/report-format/edit", settingsController.updateReportFormat);
router.delete("/report-format/:id", settingsController.deleteReportFormat);


export const settingsRouter = router;

