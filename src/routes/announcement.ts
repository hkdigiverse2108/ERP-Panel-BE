import express from "express";
import { announcementController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = express.Router();

router.get("/all", announcementController.getAllAnnouncement);
router.get("/:id", announcementController.getAnnouncementById);

router.use(superAdminJwt);
router.post("/add", announcementController.addAnnouncement);
router.put("/edit", announcementController.editAnnouncementById);
router.delete("/:id", announcementController.deleteAnnouncementById);

export const announcementRouter = router;
