import { Router } from "express";
import { settingsController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = Router();

router.get("/all", settingsController.getSettings);
router.use(superAdminJwt);
router.put("/update", settingsController.updateSettings);

export const settingsRouter = router;
