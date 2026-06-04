import { apiResponse, HTTP_STATUS } from "../../common";
import { notificationModel } from "../../database";
import { countData, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, updateMany } from "../../helper";
import { deleteNotificationSchema, readNotificationSchema } from "../../validation";
import { redisGet, redisSet, redisdelPattern } from "../../helper";

const ObjectId = require("mongoose").Types.ObjectId;

export const getAllNotification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `notification:all:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Notification"), cachedData, {}));
    let { page, limit, search, activeFilter, companyFilter, branchFilter, readFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (companyFilter) {
      criteria.companyId = new ObjectId(companyFilter);
    }

    if (branchFilter) {
      criteria.branchId = new ObjectId(branchFilter);
    }

    if (readFilter !== undefined) criteria.isRead = readFilter == "true";
    if (search) {
      criteria.$or = [{ title: { $regex: search, $options: "si" } }, { message: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    const options: any = {
      sort: { createdAt: -1 },
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }
    const response = await getDataWithSorting(notificationModel, criteria, {}, options);
    const totalData = await countData(notificationModel, criteria);
    const totalUnreadData = await countData(notificationModel, { ...criteria, isRead: false });
    const totalPages = Math.ceil(totalData / (limit ? parseInt(limit) : 10)) || 1;

    const state = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : totalData,
      totalPages,
    };

    const result = { notification_data: response, totalData, unreadCount: totalUnreadData, state };
    await redisSet(cacheKey, result, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Notification"), result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const readNotification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = readNotificationSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    const response = await updateData(notificationModel, { _id: new ObjectId(value.id), isDeleted: false }, { isRead: true, updatedBy: user?._id }, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Notification"), {}, {}));
    }

    await redisdelPattern("notification:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Notification"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const readAllNotification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const criteria: any = { userId: user?._id, isRead: false, isDeleted: false };

    // Also follow branch/company if applicable
    if (user?.companyId?._id) criteria.companyId = user.companyId._id;
    if (user?.branchId?._id) criteria.branchId = user.branchId._id;

    const response = await updateMany(notificationModel, criteria, { isRead: true, updatedBy: user?._id }, {});

    await redisdelPattern("notification:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("All Notifications"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteNotification = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deleteNotificationSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await updateData(notificationModel, { _id: new ObjectId(value.id), userId: user?._id, isDeleted: false }, { isDeleted: true, updatedBy: user?._id }, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Notification"), {}, {}));
    }

    await redisdelPattern("notification:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Notification"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
