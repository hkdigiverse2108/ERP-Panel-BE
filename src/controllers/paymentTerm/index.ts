import { apiResponse, HTTP_STATUS } from "../../common";
import { paymentTermModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter } from "../../helper";
import { addPaymentTermSchema, deletePaymentTermSchema, editPaymentTermSchema, getPaymentTermSchema } from "../../validation";

export const addPaymentTerm = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = addPaymentTermSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    const isExist = await getFirstMatch(paymentTermModel, { name: value?.name, companyId: value.companyId, isDeleted: false }, {}, {});
    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Payment Term"), {}, {}));

    value.createdBy = user?._id;
    value.updatedBy = user?._id;

    const response = await createOne(paymentTermModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Payment Term"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editPaymentTerm = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = editPaymentTermSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    let isExist = await getFirstMatch(paymentTermModel, { _id: value.paymentTermId, isDeleted: false }, {}, {});
    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material Consumption"), {}, {}));

    isExist = await getFirstMatch(
      paymentTermModel,
      {
        name: value?.name,
        companyId: isExist.companyId,
        isDeleted: false,
        _id: { $ne: value?.paymentTermId },
      },
      {},
      {},
    );
    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Payment Term"), {}, {}));

    value.updatedBy = user?._id;

    const response = await updateData(paymentTermModel, { _id: value?.paymentTermId, isDeleted: false }, value, {});
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Payment Term"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Payment Term"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deletePaymentTermById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deletePaymentTermSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    if (!(await checkIdExist(paymentTermModel, value?.id, "Payment Term", res))) return;

    const updateObj = {
      isDeleted: true,
      updatedBy: user?._id,
    };

    const response = await updateData(paymentTermModel, { _id: value?.id, isDeleted: false }, updateObj, {});
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Payment Term"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Payment Term"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPaymentTerm = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page, limit, search, activeFilter, companyFilter, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options: any = {
      sort: { name: 1 },
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(paymentTermModel, criteria, {}, options);
    const totalData = await countData(paymentTermModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Payment Term"), { paymentTerm_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getPaymentTermById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPaymentTermSchema.validate(req.params);
    const { id } = value;

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      paymentTermModel,
      { _id: id, isDeleted: false },
      {},
      {
        populate: [{ path: "companyId", select: "name" }],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Payment Term"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Payment Term"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Dropdown API - returns only active payment terms in { _id, name } format
export const getPaymentTermDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    const response = await getDataWithSorting(
      paymentTermModel,
      criteria,
      { _id: 1, name: 1, days: 1 },
      {
        sort: { name: 1 },
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      days: item.days,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Payment Term"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
