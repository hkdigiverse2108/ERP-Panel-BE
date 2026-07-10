import { Router } from "express";
import { messengerLogController } from "../controllers";

const router = Router();

router.post("/send", messengerLogController.sendManualMessage);
router.get("/", messengerLogController.getAllLogs);
router.get("/:contactId", messengerLogController.getLogsForContact);

export const messengerLogRouter = router;
