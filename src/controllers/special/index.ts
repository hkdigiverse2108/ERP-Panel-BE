import { apiResponse, HTTP_STATUS } from "../../common";
import { monthlySpecialModel } from "../../database";
import { countData, createOne, getDataWithSorting, reqInfo, responseMessage, updateData, redisGet, redisSet, redisdelPattern } from "../../helper";
import { addSpecialSchema, editSpecialSchema, getSpecialSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addSpecial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = addSpecialSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(monthlySpecialModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    await redisdelPattern("special:*");
    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Special Item"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editSpecialById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = editSpecialSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    value.updatedBy = user?._id || null;

    const response = await updateData(monthlySpecialModel, { _id: new ObjectId(value.specialId), isDeleted: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Special Item"), {}, {}));
    }

    await redisdelPattern("special:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Special Item"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteSpecialById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = getSpecialSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await updateData(monthlySpecialModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    await redisdelPattern("special:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Special Item"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllSpecial = async (req, res) => {
  reqInfo(req);
  try {
    const cacheKey = `special:all:req:${JSON.stringify(req.query)}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Special Item"), cachedData, {}));

    let { page, limit, search, activeFilter } = req.query;
    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.name = { $regex: search, $options: "si" };
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "createdBy", select: "fullName userType" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(monthlySpecialModel, criteria, {}, options);
    const totalData = await countData(monthlySpecialModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = { page, limit, totalPages };

    const result = { specials_data: response, totalData, state };
    await redisSet(cacheKey, result, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Special Item"), result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};