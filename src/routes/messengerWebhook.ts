import { Router } from "express";
import { messengerWebhookController } from "../controllers";

const router = Router();

router.get("/", messengerWebhookController.verifyWebhook);
router.post("/", messengerWebhookController.receiveWebhook);

export const messengerWebhookRouter = router;
