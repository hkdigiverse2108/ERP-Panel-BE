import express from "express";
import { announcementController } from "../controllers";

const router = express.Router();
router.get("/all", announcementController.getAllAnnouncement);
router.post("/add", announcementController.addAnnouncement);
router.put("/edit", announcementController.editAnnouncementById);
router.delete("/:id", announcementController.deleteAnnouncementById);
router.get("/:id", announcementController.getAnnouncementById);

export const announcementRouter = router;
