import path, { parse } from "path";
import url from "url";
import fs from "fs";
import { apiResponse, HTTP_STATUS } from "../../common";
import { reqInfo, responseMessage } from "../../helper";
import { deleteImageSchema } from "../../validation";

export const uploadFile = async (req, res) => {
  reqInfo(req);
  try {
    const hasImage = req?.files && req?.files?.images && req?.files?.images?.length > 0;
    const hasPdf = req?.files && req?.files?.pdf && req?.files?.pdf?.length > 0;

    if (!hasImage && !hasPdf) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.noFileUploaded, {}, {}));
    }

    const uploadedImages = [];
    const uploadedPdfs = [];

    if (hasImage) {
      req.files.images.forEach((file) => {
        const cleanPath = file.path.replace(/\\/g, "/");
        const imageUrl = `${process.env.BACKEND_URL}/${cleanPath}`;
        uploadedImages.push(imageUrl);
      });
    }

    if (hasPdf) {
      req.files.pdf.forEach((file) => {
        const cleanPath = file.path.replace(/\\/g, "/");
        const pdfUrl = `${process.env.BACKEND_URL}/${cleanPath}`;
        uploadedPdfs.push(pdfUrl);
      });
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.fileUploadSuccess, { images: uploadedImages, pdfs: uploadedPdfs }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteUploadedFile = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = deleteImageSchema.validate(req.body);

    if (error) res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const { fileUrl } = value;

    const parsedUrl = url.parse(fileUrl);
    const pathParts = (parsedUrl.pathname || "").split("/").filter(Boolean);

    const allowedTypes = ["images", "pdfs"];
    const type = pathParts.find((p) => allowedTypes.includes(p));

    if (!type) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.unsupportedFileType, {}, {}));
    }

    const filePath = path.join(process.cwd(), parsedUrl.pathname.replace(/^\\/, ""));

    if (!fs.existsSync(filePath)) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound(type), {}, {}));
    }

    fs.unlinkSync(filePath);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess(type), {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllImages = async (req, res) => {
  reqInfo(req);
  try {
    let folderName = req.headers.user?.companyId?._id?.toString() || "default";
    folderName = folderName?.replace(/[^a-zA-Z0-9_-]/g, "_");

    const dir = path.join("public/images", folderName);

    if (!fs.existsSync(dir)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.noFileUploaded, {}, {}));
    }

    const images = fs.readdirSync(dir).map((file) => `${process.env.BACKEND_URL}/public/images/${folderName}/${file}`);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Images"), images, {}));
  } catch (error) {
    console.error(error);

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPdf = async (req, res) => {
  reqInfo(req);
  try {
    let folderName = req?.headers?.user?.companyId?._id?.toString() || "default";
    folderName = folderName?.replace(/[^a-zA-Z0-9_-]/g, "_");

    const dir = path.join("public/pdfs", folderName);

    if (!fs.existsSync(dir)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.noFileUploaded, {}, {}));
    }

    const pdfs = fs.readdirSync(dir).map((file) => `${process.env.BACKEND_URL}/public/pdfs/${folderName}/${file}`);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("pdf"), pdfs, {}));
  } catch (error) {
    console.error(error);

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
