import path from "path";
import url from "url";
import fs from 'fs';
import { apiResponse, HTTP_STATUS } from "../../common";
import { reqInfo, responseMessage } from "../../helper";
import { deleteImageSchema } from "../../validation";


export const uploadFile = async (req, res) => {
  reqInfo(req);

  try {
    // console.log(req);
    // console.log("uploadFile Destination Reach", req.files);

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
        // console.log("imageUrl :-", imageUrl);
        uploadedImages.push(imageUrl);
        // console.log("UploadedImages -", uploadedImages);
      });
    }

    if (hasPdf) {
      req.files.pdf.forEach((file) => {
        const cleanPath = file.path.replace(/\\/g, "/");
        const pdfUrl = `${process.env.BACKEND_URL}/${cleanPath}`;
        uploadedPdfs.push(pdfUrl);
        // console.log("uploadedPdfs -", uploadedPdfs);
      });
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage.fileUploadSuccess, {}, {}));
  } catch (error) {
    console.log(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const deleteUploadedFile = async (req, res) => {
  reqInfo(req);
  try {
    console.log(req.body);

    const { error, value } = deleteImageSchema.validate(req.body);

    if (error) res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0].message, {}, {}));

    const { fileUrl } = req.body;

    const parsedUrl = url.parse(fileUrl);
    const pathParts = (parsedUrl.pathname || "").split("/").filter(Boolean);

    const type = pathParts[0];

    if (type === "images") {
      const fileName = pathParts[1];

      if (!fileName) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.invalidImageUrl, {}, {}));
      }
      const imagePath = path.join(process.cwd(), "images", fileName);

      // if(!fs)
    }
  } catch (error) {
    console.log(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
