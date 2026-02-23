import { Router } from "express";
import { socialMediaController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = Router();

router.get("/get", socialMediaController.getSocialMedia);
router.use(superAdminJwt);
router.put("/update", socialMediaController.updateSocialMedia);

export const socialMediaRoute = router;
