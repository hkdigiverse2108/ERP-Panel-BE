import express from "express";
import { feedbackController } from "../controllers";

const router = express.Router();

router.get("/all", feedbackController.getAllFeedback);
router.post("/add", feedbackController.addFeedback);
router.put("/edit", feedbackController.editFeedback);
router.delete("/:id", feedbackController.deleteFeedback);
router.get("/:id", feedbackController.getOneFeedback);

export const feedbackRouter = router;

