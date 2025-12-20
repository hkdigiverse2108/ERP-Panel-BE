import { HTTP_STATUS } from "../../common";
import { apiResponse, isValidObjectId } from "../../common/utils";
import { branchModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addBranchSchema, deleteBranchSchema, editBranchSchema, getBranchSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addBranch = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = addBranchSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, error?.details[0].message, {}, {}));

    const existingBranch = await getFirstMatch(branchModel, { name: { $regex: `^${value?.name.trim()}$`, $options: "i" }, isDeleted: false }, {}, {});

    if (existingBranch) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Branch"), {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(branchModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

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

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0].message, {}, {}));

    let isExist = await getFirstMatch(branchModel, { name: value?.name, isDeleted: false }, {}, {});
    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Name"), {}, {}));

    value.updatedBy = user?._id || null;
    const response = await updateData(branchModel, { _id: new ObjectId(value?.branchId), isDeleted: false }, value, {});
    console.log("response", response);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Branch details"), {}, {}));

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

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).status(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    const isBranchExist = await getFirstMatch(branchModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isBranchExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Branch"), {}, {}));

    let payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(branchModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Branch details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Branch details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllBranch = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "i" } }, { address: { $regex: search, $options: "i" } }];
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
        criteria.createdAt = { $gte: start, $lte: end };
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

    const response = await getDataWithSorting(branchModel, criteria, {}, options);
    const totalData = await countData(branchModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages, totalData, hasNextPage: page < totalPages, hasPrevPage: page > 1 };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Branch"), { branch_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getBranchById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getBranchSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(branchModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Branch details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Branch details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};
