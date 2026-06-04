import { apiResponse, HTTP_STATUS } from "../../common";
import { credentialModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, redisGet, redisSet, redisdelPattern } from "../../helper";
import { addCredentialSchema, deleteCredentialSchema, editCredentialSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addCredential = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = addCredentialSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const existing = await getFirstMatch(credentialModel, { projectId: value.projectId, isDeleted: false }, {}, {});
    if (existing) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Project ID"), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(credentialModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    await redisdelPattern("credential:*");
    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Credential"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editCredentialById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = editCredentialSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    if (value.projectId) {
      const existing = await getFirstMatch(credentialModel, { projectId: value.projectId, _id: { $ne: value.credentialId }, isDeleted: false }, {}, {});
      if (existing) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Project ID"), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(credentialModel, { _id: new ObjectId(value.credentialId), isDeleted: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Credential"), {}, {}));
    }

    await redisdelPattern("credential:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Credential"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteCredentialById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = deleteCredentialSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await updateData(credentialModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    await redisdelPattern("credential:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Credential"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllCredential = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers || {};
    const userType = user?.userType || "guest";
    const cacheKey = `credential:all:req:${JSON.stringify(req.query)}:user:${userType}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Credential"), cachedData, {}));

    let { page, limit, search, activeFilter } = req.query;
    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.projectId = { $regex: search, $options: "si" };
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

    const response = await getDataWithSorting(credentialModel, criteria, {}, options);
    const totalData = await countData(credentialModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = { page, limit, totalPages };

    const responsePayload = { credential_data: response, totalData, state };
    await redisSet(cacheKey, responsePayload, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Credential"), responsePayload, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};