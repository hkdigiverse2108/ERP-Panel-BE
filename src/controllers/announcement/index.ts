import { apiResponse, HTTP_STATUS } from "../../common";
import { announcementModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { editAnnouncementSchema, addAnnouncementSchema, getAnnouncementSchema, deleteAnnouncementSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addAnnouncement = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = addAnnouncementSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    let isExist = undefined;
    if (value?.version) {
      isExist = await getFirstMatch(announcementModel, { version: value?.version, isDeleted: false }, {}, {});
      if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Version"), {}, {}));
    }

    // if(value?.link){
    //   isExist = await getFirstMatch(announcementModel, { link: value?.link, isDeleted: false }, {}, {});
    //   if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Link"), {}, {}));
    // }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(announcementModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Announcement"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editAnnouncementById = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;
    let { error, value } = editAnnouncementSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    let isExist = undefined;

    if (value?.version) {
      isExist = await getFirstMatch(announcementModel, { version: value?.version, isDeleted: false, _id: { $ne: value?.id } }, {}, {});
      if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Version"), {}, {}));
    }

    if (value?.link) {
      isExist = await getFirstMatch(announcementModel, { link: value?.link, isDeleted: false, _id: { $ne: value?.id } }, {}, {});
      if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Link"), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(announcementModel, { _id: new ObjectId(value?._id), isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Announcement details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Announcement details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteAnnouncementById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = deleteAnnouncementSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).status(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isExist = await getFirstMatch(announcementModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Announcement"), {}, {}));

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(announcementModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Announcement details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Announcement details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllAnnouncement = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate, activeFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ version: { $regex: search, $options: "si" } }, { link: { $regex: search, $options: "si" } }, { desc: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
        criteria.createdAt = { $gte: start, $lte: end };
      }
    }

    const options: any = {
      sort: { createdAt: -1 },
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(announcementModel, criteria, {}, options);
    const totalData = await countData(announcementModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Announcement"), { announcement_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAnnouncementById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getAnnouncementSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(announcementModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Announcement details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Announcement details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};
