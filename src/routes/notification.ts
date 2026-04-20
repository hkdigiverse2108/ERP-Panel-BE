import express from "express";
import { notificationController } from "../controllers";

const router = express.Router();

router.get("/all", notificationController.getAllNotification);
router.put("/read/:id", notificationController.readNotification);
router.put("/read-all", notificationController.readAllNotification);
router.delete("/:id", notificationController.deleteNotification);

export const notificationRouter = router;
