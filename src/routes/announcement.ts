import express from "express";
import { announcementController } from "../controllers";
import { adminJwt } from "../helper";

const router = express.Router();

router.get("/all", announcementController.getAllAnnouncement);

router.use(adminJwt);

router.post("/add", announcementController.addAnnouncement);
router.put("/edit", announcementController.editAnnouncementById);
router.delete("/:id", announcementController.deleteAnnouncementById);
router.get("/:id", announcementController.getAnnouncementById);

export const announcementRouter = router;
