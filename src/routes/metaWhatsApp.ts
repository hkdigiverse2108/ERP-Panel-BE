import { Router } from "express";
import { metaWhatsAppController } from "../controllers";

const router = Router();

router.post("/account", metaWhatsAppController.upsertAccount);
router.get("/account/all", metaWhatsAppController.getAccounts);
router.post("/template/create", metaWhatsAppController.createTemplate);
router.post("/template/sync", metaWhatsAppController.syncTemplates);
router.get("/template/all", metaWhatsAppController.getTemplates);
router.delete("/template/:id", metaWhatsAppController.deleteTemplate);
router.post("/send/pos-bill", metaWhatsAppController.sendPosBill);
router.post("/send/contacts", metaWhatsAppController.bulkSendContacts);
router.get("/logs/all", metaWhatsAppController.getMessageLogs);

export const metaWhatsAppRouter = router;
