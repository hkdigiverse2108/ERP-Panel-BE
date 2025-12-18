import express from "express";
import { contactController } from "../controllers";

const router = express.Router();
router.get("/all", contactController.getAllContact);
router.post("/add", contactController.addContact);
router.put("/edit", contactController.editContactById);
router.delete("/:id", contactController.deleteContactById);
router.get("/:id", contactController.getContactById);

export const contactRouter = router;
