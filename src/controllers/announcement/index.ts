import mongoose from "mongoose";
import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { announcementModel, companyModel } from "../../database/model";
import {
  createOne,
  findAllAndPopulate,
  getFirstMatch,
  reqInfo,
  responseMessage,
  updateData,
} from "../../helper";
import { announcementSchema, announcementUpdateSchema } from "../../validation";

export const addAnnouncement = async (req, res) => {
  reqInfo(req);
  try {
    const objAnnouncement = req.body;
    const { error, value } = announcementSchema.validate(objAnnouncement);

    if (!mongoose.Types.ObjectId.isValid(value?.companyId)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            responseMessage.invalidId("comapny Id"),
            {},
            {}
          )
        );
    }

    if (error)
      return res
        .status(HTTP_STATUS.NOT_IMPLEMENTED)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_IMPLEMENTED,
            error?.details[0].message,
            {},
            {}
          )
        );

    let existingCompany = await getFirstMatch(
      companyModel,
      { _id: value?.companyId, isDeleted: false },
      {},
      {}
    );

    if (
      !existingCompany ||
      (Array.isArray(existingCompany) && existingCompany.length <= 0)
    ) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage.getDataNotFound("Company"),
            {},
            {}
          )
        );
    }

    const response = await createOne(announcementModel, value);
    if (response)
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            responseMessage.addDataSuccess("Announcement"),
            response,
            {}
          )
        );
  } catch (error) {
    console.log("error : ", error);
  }
};

export const getAllAnnouncement = async (req, res) => {
  reqInfo(req);
  try {
    const response = await findAllAndPopulate(
      announcementModel,
      { isDeleted: false },
      {},
      { lean: true },
      [{ path: "companyId" }]
    );

    if (response)
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            responseMessage.getDataSuccess("Announcement list"),
            response,
            {}
          )
        );
  } catch (error) {
    console.log("error : ", error);
  }
};

export const updateAnnouncement = async (req, res) => {
  reqInfo(req);
  try {
    const objAnnouncement = req.body;
    const { error, value } = announcementUpdateSchema.validate(objAnnouncement);

    if (!mongoose.Types.ObjectId.isValid(value?._id)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            responseMessage.invalidId("Announcement Id"),
            {},
            {}
          )
        );
    }

    if (error)
      return res
        .status(HTTP_STATUS.NOT_IMPLEMENTED)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_IMPLEMENTED,
            error?.details[0].message,
            {},
            {}
          )
        );

    let existingAnnouncement = await getFirstMatch(
      announcementModel,
      { _id: value?._id, isDeleted: false },
      {},
      {}
    );

    if (
      !existingAnnouncement ||
      (Array.isArray(existingAnnouncement) && existingAnnouncement.length <= 0)
    ) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage.getDataNotFound("Announcement"),
            {},
            {}
          )
        );
    }

    const response = await updateData(
      announcementModel,
      {
        isDeleted: false,
        _id: value?._id,
      },
      {
        companyId: value?.companyId,
        version: value?.version,
        desc: value?.desc,
        link: value?.link,
      },
      {}
    );

    if (response)
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            responseMessage.updateDataSuccess("Announcement data"),
            response,
            {}
          )
        );
  } catch (error) {
    console.log("error : ", error);
  }
};

export const deleteAnnouncement = async (req, res) => {
  reqInfo(req);
  try {
    const { announcementId } = req.params;

    if (!announcementId) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage.getDataNotFound("Announcement details"),
            [],
            {}
          )
        );
    }

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            responseMessage.invalidId("Announcement Id"),
            {},
            {}
          )
        );
    }

    let existingAnnouncement = await getFirstMatch(
      announcementModel,
      { _id: announcementId, isDeleted: false },
      {},
      {}
    );

    if (
      !existingAnnouncement ||
      (Array.isArray(existingAnnouncement) && existingAnnouncement.length <= 0)
    ) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage.getDataNotFound("Announcement"),
            {},
            {}
          )
        );
    }

    const response = await updateData(
      announcementModel,
      {
        isDeleted: false,
        _id: announcementId,
      },
      {
        isDeleted: true,
      },
      {}
    );

    if (response)
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            responseMessage.deleteDataSuccess("Announcement record"),
            response,
            {}
          )
        );
  } catch (error) {
    console.log("error : ", error);
  }
};
