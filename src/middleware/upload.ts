import multer from "multer";
import path from "path";
import fs from "fs";

export const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // console.log("Upload Destination Reach", req?.query?.folder);
    console.log("fileStorage Destination Reach", req.headers.user); // for company Name as Folder Name
    // const user = req.headers.user;
    // if (user) {
    // }

    let folderName = req?.query?.folder || "default";
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

// export const fileStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const dir = path.join(process.cwd(), "images");

//     if (!fs.existsSync(dir)) {
//       fs.mkdirSync(dir, { recursive: true });
//     }
//     cb(null, "images");
//   },
//   filename: (req, file, cb) => {
//     const sanitizedOriginalName = file.originalname.replace(/\s+/g, "-");
//     cb(null, `${Date.now()}_${sanitizedOriginalName}`);
//   },
// });
