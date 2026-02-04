import { apiResponse, HTTP_STATUS } from "../../common";
import { accountGroupModel, additionalChargeModel, taxModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addAdditionalChargeSchema, deleteAdditionalChargeSchema, editAdditionalChargeSchema, getAdditionalChargeSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addAdditionalCharge = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = addAdditionalChargeSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!(await checkIdExist(taxModel, value?.taxId, "Tax", res))) return;
    if (!(await checkIdExist(accountGroupModel, value?.accountGroupId, "account Group", res))) return;

    const existingCharge = await getFirstMatch(additionalChargeModel, { name: value.name, type: value.type, isDeleted: false }, {}, {});

    if (existingCharge) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Additional Charge"), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(additionalChargeModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Additional Charge"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editAdditionalChargeById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = editAdditionalChargeSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    if (!(await checkIdExist(additionalChargeModel, value?.additionalChargeId, "Additional Charge", res))) return;

    const existingCharge = await getFirstMatch(additionalChargeModel, { name: value.name, type: value.type, _id: { $ne: value.additionalChargeId }, isDeleted: false }, {}, {});

    if (existingCharge) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Additional Charge"), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(additionalChargeModel, { _id: new ObjectId(value.additionalChargeId), isDeleted: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Additional Charge"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Additional Charge"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteAdditionalChargeById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deleteAdditionalChargeSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const charge = await getFirstMatch(additionalChargeModel, { _id: value.id, isDeleted: false }, {}, {});

    if (!charge) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Additional Charge"), {}, {}));
    }

    const response = await updateData(additionalChargeModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Additional Charge"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllAdditionalCharge = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate, activeFilter, companyFilter, typeFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (typeFilter) {
      criteria.type = typeFilter;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { hsnSac: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.createdAt = {
          $gte: start,
          $lte: end,
        };
      }
    }

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "taxId", select: "name taxPercentage" },
        { path: "accountGroupId", select: "name" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(additionalChargeModel, criteria, {}, options);
    const totalData = await countData(additionalChargeModel, criteria);

    const totalPages = Math.ceil(totalData / parseInt(limit)) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Additional Charge"), { additional_charge_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAdditionalChargeById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getAdditionalChargeSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await getFirstMatch(
      additionalChargeModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "taxId", select: "name taxPercentage" },
          { path: "accountGroupId", select: "name" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Additional Charge"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Additional Charge"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAdditionalChargeDropdown = async (req, res) => {
  reqInfo(req);
  try {
    let { typeFilter, companyFilter } = req.query;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (typeFilter) {
      criteria.type = typeFilter;
    }

    const response = await getDataWithSorting(
      additionalChargeModel,
      criteria,
      { _id: 1, name: 1, type: 1, defaultValue: 1, taxId: 1 },
      {
        sort: { name: 1 },
        populate: [{ path: "taxId", select: "name taxPercentage" }],
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      type: item.type,
      defaultValue: item.defaultValue,
      tax: item.taxId,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Additional Charge"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
