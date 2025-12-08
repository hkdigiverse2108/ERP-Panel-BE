import express from "express";
import { announcementController, companyController } from "../controllers";

const router = express.Router();
router.get("/", announcementController.getAllAnnouncement);
router.post("/add", announcementController.addAnnouncement);
router.put("/", announcementController.updateAnnouncement);
router.delete("/:announcementId", announcementController.deleteAnnouncement);

export const announcementRouter = router;
