import { apiResponse, HTTP_STATUS } from "../../common";
import { discountModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, findAllAndPopulate, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addDiscountSchema, deleteDiscountSchema, editDiscountSchema, getDiscountSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

// Populate paths for discount references
const discountPopulate = [
  { path: "companyId", select: "name" },
  { path: "branchIds", select: "name" },
  { path: "categoryIds", select: "name" },
  { path: "subcategoryIds", select: "name" },
  { path: "brandIds", select: "name" },
  { path: "productIds", select: "name" },
  { path: "excludedProductIds", select: "name" },
  { path: "buyXGetY.getProductIds", select: "name" },
  { path: "productAtFixAmount.freeProductIds", select: "name" },
  { path: "createdBy", select: "fullName" },
  { path: "updatedBy", select: "fullName" },
];

export const addDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addDiscountSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate date range when end date is set
    if (value.hasEndDate && value.endDate && new Date(value.startDate) >= new Date(value.endDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Start Date must be before End Date", {}, {}));
    }

    // Check unique title
    const titleExist = await getFirstMatch(discountModel, { companyId: value.companyId, title: value?.title, isDeleted: false }, {}, {});
    if (titleExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Title"), {}, {}));

    // Check unique discount code (if provided)
    if (value.discountCode) {
      const codeExist = await getFirstMatch(discountModel, { companyId: value.companyId, discountCode: value.discountCode, isDeleted: false }, {}, {});
      if (codeExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Discount Code"), {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(discountModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Discount"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editDiscountSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let isExist = await getFirstMatch(discountModel, { _id: value?.discountId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Discount"), {}, {}));
    }

    // Check unique title
    if (value.title) {
      const titleExist = await getFirstMatch(discountModel, { companyId: isExist?.companyId, title: value?.title, isDeleted: false, _id: { $ne: value?.discountId } }, {}, {});
      if (titleExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Title"), {}, {}));
    }

    // Check unique discount code (if being updated)
    if (value.discountCode) {
      const codeExist = await getFirstMatch(discountModel, { companyId: isExist?.companyId, discountCode: value.discountCode, isDeleted: false, _id: { $ne: value?.discountId } }, {}, {});
      if (codeExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Discount Code"), {}, {}));
    }

    // Validate date range if dates are being updated
    const startDate = value.startDate || isExist.startDate;
    const endDate = value.endDate || isExist.endDate;
    const hasEndDate = value.hasEndDate !== undefined ? value.hasEndDate : isExist.hasEndDate;

    if (hasEndDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Start Date must be before End Date", {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(discountModel, { _id: value?.discountId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Discount"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Discount"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteDiscountSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(discountModel, value?.id, "Discount", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(discountModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Discount"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Discount"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, status, startDate, endDate, activeFilter, companyFilter, discountMode, appliesTo, branchFilter } = req.query;

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
      criteria.$or = [
        { title: { $regex: search, $options: "si" } },
        { discountCode: { $regex: search, $options: "si" } },
      ];
    }

    if (status) {
      criteria.status = status;
    }

    if (discountMode) {
      criteria.discountMode = discountMode;
    }

    if (appliesTo) {
      criteria.appliesTo = appliesTo;
    }

    if (branchFilter) {
      criteria.branchIds = new ObjectId(branchFilter);
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.startDate = { $lte: end };
        criteria.$and = [
          { $or: [{ endDate: { $gte: start } }, { endDate: null }, { hasEndDate: false }] },
        ];
      }
    }

    const options = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    };

    const response = await findAllAndPopulate(discountModel, criteria, {}, options, discountPopulate);
    const totalData = await countData(discountModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Discount"), { discount_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneDiscount = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getDiscountSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await findAllAndPopulate(discountModel, { _id: value?.id, isDeleted: false }, {}, {}, discountPopulate);

    if (!response || response.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Discount"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Discount"), response[0], {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
