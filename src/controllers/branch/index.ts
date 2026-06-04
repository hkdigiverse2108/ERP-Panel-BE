import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { branchModel, companyModel } from "../../database";
import { applyDateFilter, checkIdExist, clonePrefixesToBranch, countData, createOne, getDataWithSorting, getFirstMatch, handleIncludeId, redisGet, redisSet, redisdelPattern, reqInfo, responseMessage, updateData } from "../../helper";
import { addBranchSchema, deleteBranchSchema, editBranchSchema, getBranchSchema, updateBranchReportConfigSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addBranch = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    let { error, value } = addBranchSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    if (!(await checkIdExist(companyModel, value.companyId, "Company", res))) return;

    value.name = value?.name.trim();

    const existingBranch = await getFirstMatch(branchModel, { companyId: value.companyId, name: value?.name, isDeleted: false }, {}, {});

    if (existingBranch) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Branch"), {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(branchModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    // Auto-clone prefixes for the new branch
    await clonePrefixesToBranch(value.companyId, response._id, user?._id);

    await redisdelPattern("branch:*");

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Branch"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editBranchById = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;

    let { error, value } = editBranchSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    let isExist = await getFirstMatch(branchModel, { _id: value.branchId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Branch"), {}, {}));
    }

    value.companyId = isExist.companyId;

    if (!(await checkIdExist(companyModel, value?.companyId, "Company", res))) return;

    isExist = await getFirstMatch(branchModel, { companyId: value.companyId, name: value?.name, isDeleted: false, _id: { $ne: value?.branchId } }, {}, {});
    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Name"), {}, {}));

    value.updatedBy = user?._id || null;

    const response = await updateData(branchModel, { _id: value?.branchId, isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Branch details"), {}, {}));

    await redisdelPattern("branch:*");

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Branch details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteBranchById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = deleteBranchSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isBranchExist = await getFirstMatch(branchModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isBranchExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Branch"), {}, {}));

    if (isBranchExist?.isHeadBranch == true) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Cannot delete the Head Branch", {}, {}));
    }

    let payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(branchModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Branch details"), {}, {}));

    await redisdelPattern("branch:*");

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Branch details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllBranch = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const cacheKey = `branch:all:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Branch"), cachedData, {}));
    }

    let { page, limit, search, startDate, endDate, activeFilter, companyFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { address: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "bankId", select: "name" },
        { path: "userIds", select: "fullName" },
        { path: "createdBy", select: "fullName userType" },
        { path: "address.country", select: "name code" },
        { path: "address.state", select: "name code" },
        { path: "address.city", select: "name code" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(branchModel, criteria, {}, options);
    const totalData = await countData(branchModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages };

    const responsePayload = { branch_data: response, totalData, state: stateObj };
    await redisSet(cacheKey, responsePayload, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Branch"), responsePayload, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getBranchById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const cacheKey = `branch:one:req:${JSON.stringify(req.params)}:user:${userType}:company:${companyId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Branch details"), cachedData, {}));
    }

    const { error, value } = getBranchSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      branchModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "bankId", select: "name" },
          { path: "userIds", select: "fullName" },
          { path: "createdBy", select: "fullName userType" },
          { path: "address.country", select: "name code" },
          { path: "address.state", select: "name code" },
          { path: "address.city", select: "name code" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Branch details"), {}, {}));

    await redisSet(cacheKey, response, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Branch details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getBranchDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    let companyId = user?.companyId?._id;
    const cacheKey = `branch:dropdown:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Branch"), cachedData, {}));
    }

    const { companyFilter, includeId } = req.query;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyFilter && userType === USER_TYPES.SUPER_ADMIN) criteria.companyId = companyFilter;
    else if (companyId) criteria.companyId = companyId;

    criteria = handleIncludeId(criteria, includeId);

    const response = await getDataWithSorting(
      branchModel,
      criteria,
      { _id: 1, name: 1 },
      {
        sort: { name: 1 },
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
    }));

    await redisSet(cacheKey, dropdownData, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Branch"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const updateBranchReportConfig = async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = updateBranchReportConfigSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    let branchId = value.branchId;

    // Security: Only Super Admin can specify which branch to update.
    // Others are locked to their own branch.
    if (user?.userType !== USER_TYPES.SUPER_ADMIN || !branchId) {
      branchId = user?.branchId?._id || user?.branchId;
    }

    if (!branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Branch ID is required", {}, {}));

    const { type, formatName } = value.reportConfig;

    // 1. Remove any existing config for this specific type to avoid duplicates
    await branchModel.updateOne(
      { _id: branchId },
      { $pull: { reportConfig: { type } } }
    );

    // 2. Add the new configuration for this type
    const response = await branchModel.findOneAndUpdate(
      { _id: branchId, isDeleted: false },
      {
        $push: { reportConfig: { type, formatName } },
        $set: { updatedBy: user?._id || null }
      },
      { new: true }
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Branch"), {}, {}));

    await redisdelPattern("branch:*");

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Branch report configuration"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};



