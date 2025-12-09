import multer from "multer";
import path from "path";
import fs from "fs";

export const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const companyName = req?.headers?.user?.companyId?.name;
    let folderName = companyName || "default";
    folderName = folderName.replace(/[^a-zA-Z0-9_-]/g, "_");

    const isPdf = file.mimetype === "application/pdf";
    const isImage = file.mimetype.startsWith("image/");

    let baseDir = "";
    if (isPdf) baseDir = "public/pdfs";
    else if (isImage) baseDir = "public/images";
    else baseDir = "public/others";

    const dir = path.join(process.cwd(), baseDir, folderName);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, path.join(baseDir, folderName));
  },
  filename: (_, file, cb) => {
    const sanitizedOriginalName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}_${sanitizedOriginalName}`);
  },
});

export const fileFilter = (_, file, cb) => {
  const allowed = ["image/png", "image/jpg", "image/webp", "image/jpeg", "application/pdf"];

  cb(null, allowed.includes(file.mimetype));
};

