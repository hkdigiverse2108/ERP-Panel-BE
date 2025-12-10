import mongoose from "mongoose";
import { HTTP_STATUS } from "../../common";
import { apiResponse, isValidObjectId } from "../../common/utils";
import { announcementModel, companyModel } from "../../database/model";
import {
  countData,
  createOne,
  findAllAndPopulate,
  getDataWithSorting,
  getFirstMatch,
  reqInfo,
  responseMessage,
  updateData,
} from "../../helper";
import { editAnnouncementSchema, addAnnouncementSchema, getAnnouncementSchema, deleteAnnoucementSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addAnnouncement = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = addAnnouncementSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, error?.details[0].message, {}, {}));

    if (!isValidObjectId(value?.companyId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.invalidId("comapny Id"), {}, {}));
    }

    if (error)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0].message,
            {},
            {}
          )
        );

    let existingCompany = await getFirstMatch(companyModel, { _id: value?.companyId, isDeleted: false }, {}, {});

    if (!existingCompany || (Array.isArray(existingCompany) && existingCompany.length <= 0)) { return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Company"), {}, {})); }

    let existAnnouncement = await getFirstMatch(announcementModel, { version: value?.version, isDeleted: false }, {}, {});
    if (existAnnouncement) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Version"), {}, {}));

    existAnnouncement = await getFirstMatch(announcementModel, { link: value?.phoneNumber, isDeleted: false }, {}, {});
    if (existAnnouncement) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Link"), {}, {}));

    let payload = {
      ...value,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(announcementModel, payload);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Announcement"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllAnnouncement = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [
        { version: { $regex: search, $options: "i" } },
        { link: { $regex: search, $options: "i" } },
        { desc: { $regex: search, $options: "i" } },
      ];
    }


    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) { criteria.createdAt = { $gte: start, $lte: end, }; }
    }

    const options: any = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    };

    if (page && limit) {
      options.page = (parseInt(page) + 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }


    const response = await getDataWithSorting(announcementModel, criteria, {}, options);
    const totalData = await countData(announcementModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages, totalData, hasNextPage: page < totalPages, hasPrevPage: page > 1, };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Announcement"), { announcement_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteAnnouncementById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = deleteAnnoucementSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).status(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    // if (!isValidObjectId(value?.id)) {
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("Announcement Id"), {}, {}));
    // }

    const isAnnouncementExist = await getFirstMatch(announcementModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isAnnouncementExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Announcement"), {}, {}));

    const response = await updateData(announcementModel, { _id: new ObjectId(value?.id) }, { isDeleted: true }, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Announcement details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Announcement details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAnnouncementById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getAnnouncementSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(announcementModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Announcemnet details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Annoucement details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

export const editAnnouncementById = async (req, res) => {
  reqInfo(req);

  try {
    const user = req.headers;
    const { error, value } = editAnnouncementSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0].message, {}, {}));

    if (!isValidObjectId(value?.companyId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("Company Id"), {}, {}));
    }

    if (!isValidObjectId(value?._id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("Announcement Id"), {}, {}));
    }

   let existingAnnouncemnet = await getFirstMatch(announcementModel, { version: value?.version, isDeleted: false }, {}, {});
    if (existingAnnouncemnet) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Version"), {}, {}));

    existingAnnouncemnet = await getFirstMatch(announcementModel, { link: value?.link, isDeleted: false }, {}, {});
    if (existingAnnouncemnet) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Link"), {}, {}));

    let payload = {
      ...value,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await updateData(announcementModel, { _id: new ObjectId(value?._id), isDeleted: false }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Announcement details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Announcement details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};