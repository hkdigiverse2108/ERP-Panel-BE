import express from "express";
import { contactController } from "../controllers";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/all", contactController.getAllContact);
router.get("/dropdown", contactController.getContactDropdown);
router.post("/add", contactController.addContact);
router.post("/bulk-add", upload.single("file"), contactController.addBulkContact);
router.put("/edit", contactController.editContactById);
router.delete("/:id", contactController.deleteContactById);
router.get("/:id", contactController.getContactById);

export const contactRouter = router;
