import express from "express";
import multer from "multer";
import { uploadController } from "../controllers";
import { fileFilter, fileStorage } from "../middleware";

const router = express.Router();

const upload = multer({
  storage: fileStorage,
  fileFilter,
}).fields([
  { name: "images", maxCount: 20 },
  { name: "pdf", maxCount: 20 },
]);

router.post("/", upload, uploadController.uploadFile);
router.delete("/", uploadController.deleteUploadedFile);

export const uploadRoute = router;
