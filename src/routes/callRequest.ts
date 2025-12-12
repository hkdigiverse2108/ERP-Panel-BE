import { Router } from "express";
import { callRequestController } from "../controllers";

const router = Router();

router.post("/add", callRequestController.addCallRequest);
router.put("/edit", callRequestController.editCallRequest);
router.delete("/:id", callRequestController.deleteCallRequest);
router.get("/all", callRequestController.getAllCallRequest);
router.get("/:id", callRequestController.getOneCallRequest);

export const callRequestRouter = router;
