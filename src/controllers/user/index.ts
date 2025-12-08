import { apiResponse, generateHash, HTTP_STATUS, isValidObjectId, USER_ROLES } from "../../common";
import { userModel } from "../../database/model";
import { countData, createOne, findAllAndPopulate, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { userAccountDeletionModel } from "../../database/model/userAccountDeletion";
import { createUserSchema, deleteUserSchema, editUserSchema, getUserSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addUser = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = createUserSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

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

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("user"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editUserById = async (req, res) => {
  reqInfo(req);

  try {
    const { error, value } = editUserSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0].message, {}, {}));

    if (!isValidObjectId(value?.userId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("User Id"), {}, {}));
    }

    // check user exist
    let existingUser = await getFirstMatch(userModel, { _id: new ObjectId(value?.userId), isDeleted: false }, {}, {});
    if (!existingUser) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("user"), {}, {}));

    // check email exist
    existingUser = await getFirstMatch(userModel, { email: value?.email, _id: { $ne: new ObjectId(value?.userId) }, isDeleted: false }, {}, {});
    if (existingUser) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("email"), {}, {}));

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

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("user"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("user"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteUserById = async (req, res) => {
  try {
    const { error, value } = deleteUserSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).status(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    if (!isValidObjectId(value?.id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("User Id"), {}, {}));
    }

    const isUserExist = await getFirstMatch(userModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isUserExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("user"), {}, {}));

    const response = await updateData(userModel, { _id: new ObjectId(value?.id) }, { isDeleted: true }, {});
    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("user"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("user"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllUser = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate, activeFilter, deleteFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false, role: USER_ROLES.USER };


    if (search) {
      criteria.$or = [{ fullName: { $regex: search, $options: "i" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter === "true";

    if (deleteFilter !== undefined) criteria.isDeleted = deleteFilter === "true";

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
      lean: true,
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    };

    options.sort = { createdAt: -1 };
    if (page && limit) {
      options.page = (parseInt(page) + 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(userModel, criteria, {}, options);
    const countTotal = await countData(userModel, criteria);

    const totalPages = Math.ceil(countTotal / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
      countData,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      // page_limit: Math.ceil(countTotal / (parseInt(limit) || countTotal)) || 1,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("user"), { user_data: response, totalData: countTotal, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.internalServerError, {}, error));
  }
};

export const getUserById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getUserSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(userModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("user"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("user"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

export const getAllDeletedUser = async (req, res) => {
  reqInfo(req);
  try {
    const { page, limit, search, startDate, endDate } = req.query;
    let criteria: any = { isDeleted: false },
      options: any = { lean: true };

    if (search) {
      criteria.$or = [{ fullName: { $regex: search, $options: "si" } }];
    }

    if (startDate && endDate) criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

    options.sort = { createdAt: -1 };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    let populateModel = [{ path: "userId" }];

    const response = await findAllAndPopulate(userAccountDeletionModel, criteria, {}, options, populateModel);
    const countTotal = await countData(userAccountDeletionModel, criteria);

    const stateObj = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || countTotal,
      page_limit: Math.ceil(countTotal / (parseInt(limit) || countTotal)) || 1,
    };

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("user"),
        {
          deletedUser_data: response,
          totalData: countTotal,
          state: stateObj,
        },
        {}
      )
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
