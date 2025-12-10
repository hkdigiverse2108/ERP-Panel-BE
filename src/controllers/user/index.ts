import { apiResponse, generateHash, HTTP_STATUS, isValidObjectId, USER_ROLES } from "../../common";
import { userModel } from "../../database/model";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addUserSchema, deleteUserSchema, editUserSchema, getUserSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addUser = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = addUserSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let existingUser = await getFirstMatch(userModel, { email: value?.email, isDeleted: false }, {}, {});
    if (existingUser) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Email"), {}, {}));

    existingUser = await getFirstMatch(userModel, { phoneNumber: value?.phoneNumber, isDeleted: false }, {}, {});
    if (existingUser) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Phone Number"), {}, {}));

    let payload = {
      ...value,
      createdBy: req?.headers?.user?._id || null,
      updatedBy: req?.headers?.user?._id || null,
    };
    payload.password = await generateHash(value?.password);

    const response = await createOne(userModel, payload);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("User"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editUserById = async (req, res) => {
  reqInfo(req);

  try {
    const { error, value } = editUserSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    if (!isValidObjectId(value?.userId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("User Id"), {}, {}));
    }

    // check user exist
    let existingUser = await getFirstMatch(userModel, { _id: new ObjectId(value?.userId), isDeleted: false }, {}, {});
    if (!existingUser) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("User"), {}, {}));

    // check email exist
    existingUser = await getFirstMatch(userModel, { email: value?.email, _id: { $ne: new ObjectId(value?.userId) }, isDeleted: false }, {}, {});
    if (existingUser) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Email"), {}, {}));

    // check phone number exist
    if (value?.phoneNumber) {
      existingUser = await getFirstMatch(userModel, { phoneNumber: value?.phoneNumber, _id: { $ne: new ObjectId(value?.userId) }, isDeleted: false }, {}, {});
      if (existingUser) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Phone Number"), {}, {}));
    }

    let payload = {
      ...value,
      updatedBy: req?.headers?.user?._id || null,
    };
    if (value?.password) {
      payload.password = await generateHash(value?.password);
    }

    const response = await updateData(userModel, { _id: new ObjectId(value?.userId), isDeleted: false }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("User"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("User"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteUserById = async (req, res) => {
  try {
    const { error, value } = deleteUserSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).status(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (!isValidObjectId(value?.id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("User Id"), {}, {}));
    }

    const isUserExist = await getFirstMatch(userModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isUserExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("User"), {}, {}));

    const response = await updateData(userModel, { _id: new ObjectId(value?.id) }, { isDeleted: true }, {});
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("User"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("User"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllUser = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate, activeFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false, role: USER_ROLES.USER };

    if (search) {
      criteria.$or = [{ fullName: { $regex: search, $options: "s  i" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
        criteria.createdAt = {
          $gte: start,
          $lte: end,
        };
      }
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

    const response = await getDataWithSorting(userModel, criteria, { password: 0 }, options);
    const countTotal = await countData(userModel, criteria);

    const totalPages = Math.ceil(countTotal / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
      countTotal,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      // page_limit: Math.ceil(countTotal / (parseInt(limit) || countTotal)) || 1,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("User"), { user_data: response, totalData: countTotal, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getUserById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getUserSchema.validate(req.params);
    const { id } = value;
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (!isValidObjectId(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("User Id"), {}, {}));
    }

    const response = await getFirstMatch(userModel, { _id: id, isDeleted: false }, { password: 0 }, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("User"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("User"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};