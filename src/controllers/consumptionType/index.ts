import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { ConsumptionTypeModel } from "../../database";
import { checkBranch, checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { createConsumptionTypeSchema, deleteConsumptionTypeSchema, getConsumptionTypeSchema, updateConsumptionTypeSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addConsumptionType = async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = createConsumptionTypeSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    }

    // If super admin and no companyId provided, mark as default
    if (user.userType === USER_TYPES.SUPER_ADMIN && !value.companyId) {
      value.isDefault = true;
    } else {
      value.companyId = await checkCompany(user, value);
      value.branchId = await checkBranch(user, value);
      if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.fieldIsRequired("Company Id"), {}, {}));
      if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.fieldIsRequired("Branch Id"), {}, {}));
    }

    value.createdBy = user._id;
    value.updatedBy = user._id;

    const response = await createOne(ConsumptionTypeModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.addDataSuccess("Consumption Type"), response, {}));
  } catch (error: any) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage.internalServerError, {}, error));
  }
};

export const editConsumptionType = async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = updateConsumptionTypeSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    }

    const isExist = await getFirstMatch(ConsumptionTypeModel, { _id: value.consumptionTypeId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Consumption Type"), {}, {}));
    }

    // Only super admin can edit default types
    if (isExist.isDefault && user.userType !== USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, "Only Super Admin can modify default data", {}, {}));
    }

    // If not default, must belong to the same company
    if (!isExist.isDefault && isExist.companyId.toString() !== user.companyId?._id?.toString() && user.userType !== USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage.accessDenied, {}, {}));
    }

    value.updatedBy = user._id;

    const response = await updateData(ConsumptionTypeModel, { _id: value.consumptionTypeId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.updateDataError("Consumption Type"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.updateDataSuccess("Consumption Type"), response, {}));
  } catch (error: any) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage.internalServerError, {}, error));
  }
};

export const deleteConsumptionType = async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deleteConsumptionTypeSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    }

    const isExist = await getFirstMatch(ConsumptionTypeModel, { _id: value.id, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Consumption Type"), {}, {}));
    }

    // Only super admin can delete default types
    if (isExist.isDefault && user.userType !== USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, "Only Super Admin can delete default data", {}, {}));
    }

    // If not default, must belong to the same company
    if (!isExist.isDefault && isExist.companyId.toString() !== user.companyId?._id?.toString() && user.userType !== USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage.accessDenied, {}, {}));
    }

    const response = await updateData(ConsumptionTypeModel, { _id: value.id }, { isDeleted: true, updatedBy: user._id }, {});

    if (!response) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.deleteDataError("Consumption Type"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.deleteDataSuccess("Consumption Type"), response, {}));
  } catch (error: any) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage.internalServerError, {}, error));
  }
};

export const getOneConsumptionType = async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = getConsumptionTypeSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    }

    const response = await getFirstMatch(
      ConsumptionTypeModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
          { path: "updatedBy", select: "name userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Consumption Type"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Consumption Type"), response, {}));
  } catch (error: any) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage.internalServerError, {}, error));
  }
};

export const getAllConsumptionType = async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let { page, limit, search, companyFilter, activeFilter } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const criteria: any = {
      isDeleted: false,
      $or: [{ isDefault: true }, { companyId: user.companyId?._id || companyFilter }],
    };

    if (search) {
      criteria.name = { $regex: search, $options: "si" };
    }

    if (activeFilter) {
      criteria.isActive = activeFilter;
    }

    const options = {
      sort: { isDefault: -1, createdAt: -1 },
      skip: (page - 1) * limit,
      limit: limit,
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
        { path: "updatedBy", select: "name userType" },
      ],
    };

    const response = await getDataWithSorting(ConsumptionTypeModel, criteria, {}, options);
    const totalData = await countData(ConsumptionTypeModel, criteria);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Consumption Type"), { consumptionType_data: response, totalData }, {}));
  } catch (error: any) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage.internalServerError, {}, error));
  }
};

export const consumptionTypeDropDown = async (req: any, res: any) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { search, companyFilter } = req.query;

    const criteria: any = {
      isDeleted: false,
      isActive: true,
      $or: [{ isDefault: true }, { companyId: user.companyId?._id || companyFilter }],
    };

    if (search) {
      criteria.name = { $regex: search, $options: "si" };
    }

    const response = await ConsumptionTypeModel.find(criteria, { name: 1, isDefault: 1 }).sort({ name: 1 });

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Consumption Type Dropdown"), response, {}));
  } catch (error: any) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage.internalServerError, {}, error));
  }
};
