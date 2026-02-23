import { Router } from "express";
import { settingsController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = Router();

router.get("/get", settingsController.getSettings);
router.use(superAdminJwt);
router.put("/update", settingsController.updateSettings);

export const settingsRoute = router;
