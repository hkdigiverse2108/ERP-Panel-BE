import { Router } from "express";
import { messengerTemplateController } from "../controllers";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/", messengerTemplateController.getAllTemplates);
router.post("/", messengerTemplateController.createTemplate);
router.post("/refresh", messengerTemplateController.refreshTemplateStatus);
router.post("/upload-image", upload.single("image"), messengerTemplateController.uploadTemplateImage);
router.delete("/:id", messengerTemplateController.deleteTemplate);

export const messengerTemplateRouter = router;
