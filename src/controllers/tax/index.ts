import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { taxModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, checkCompany } from "../../helper";
import { addTaxSchema, deleteTaxSchema, editTaxSchema, getTaxSchema } from "../../validation";
const ObjectId = require("mongoose").Types.ObjectId;

export const addTax = async (req, res) => {
  reqInfo(req);
  try {
    let { user } = req.headers;

    const { error, value } = addTaxSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);
    let existingTax = await getFirstMatch(
      taxModel,
      {
        isDeleted: false,
        name: value.name,
        companyId: value.companyId ?? null,
      },
      {},
      {},
    );

    if (existingTax) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Tax Name"), {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(taxModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Tax"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editTax = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = editTaxSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    let existingTax = await getFirstMatch(taxModel, { _id: value?.taxId, isDeleted: false }, {}, {});

    if (!existingTax) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Tax"), {}, {}));

    if (!existingTax.companyId && user?.userType !== USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));
    }

    // Check if another Tax with same name already exists (excluding current one)
    if (value.name) {
      let duplicateTax = await getFirstMatch(
        taxModel,
        {
          _id: { $ne: value?.taxId },
          isDeleted: false,
          name: value.name,
          companyId: existingTax.companyId ?? null,
        },
        {},
        {},
      );

      if (duplicateTax) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Tax Name"), {}, {}));
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(taxModel, { _id: value?.taxId }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Tax"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Tax"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteTax = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deleteTaxSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const existingTax = await getFirstMatch(taxModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!existingTax) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Tax"), {}, {}));

    if (!existingTax.companyId && user?.userType !== USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));
    }

    const payload = {
      updatedBy: user?._id || null,
      isDeleted: true,
    };

    const response = await updateData(taxModel, { _id: value?.id }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Tax"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Tax"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllTax = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, activeFilter, companyFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (user?.userType !== USER_TYPES.SUPER_ADMIN) {
      criteria.$or = [{ companyId: null }, { companyId: companyId }];
    }

    if (companyFilter) criteria.companyId = companyFilter;

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { name: 1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
        { path: "updatedBy", select: "name userType" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(taxModel, criteria, {}, options);
    const totalData = await countData(taxModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Tax"), { tax_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getTaxById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getTaxSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const { user } = req.headers;
    let criteria: any = { _id: value?.id, isDeleted: false };

    if (user?.userType !== USER_TYPES.SUPER_ADMIN) {
      criteria.$or = [{ companyId: null }, { companyId: user?.companyId }];
    }

    const response = await getFirstMatch(
      taxModel,
      criteria,
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
          { path: "updatedBy", select: "name userType" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Tax"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Tax"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getTaxDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const companyId = user?.companyId?._id;
    const { companyFilter, search, includeId } = req.query;
    let criteria: any = { isDeleted: false, isActive: true };

    if (user?.userType !== USER_TYPES.SUPER_ADMIN) {
      criteria.$or = [{ companyId: null }, { companyId: companyId }];
    }

    if (companyFilter) criteria.companyId = companyFilter;

    if (includeId) {
      criteria = {
        $or: [criteria, { _id: new ObjectId(includeId as string) }],
      };
    }

    const response = await getDataWithSorting(
      taxModel,
      criteria,
      { _id: 1, name: 1, percentage: 1 },
      {
        sort: { name: 1 },
        limit: search ? 50 : 1000,
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      percentage: item.percentage,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Tax"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
