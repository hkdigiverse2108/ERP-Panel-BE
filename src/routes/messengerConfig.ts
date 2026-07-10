import { Router } from "express";
import { messengerConfigController } from "../controllers";

const router = Router();

router.get("/", messengerConfigController.getConfig);
router.post("/", messengerConfigController.saveConfig);

export const messengerConfigRouter = router;
