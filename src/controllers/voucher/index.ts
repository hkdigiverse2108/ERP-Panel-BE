import { apiResponse, HTTP_STATUS, VOUCHAR_TYPE, PREFIX_MODULES } from "../../common";
import { contactModel, voucherModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, generateSequenceNumber, getAndIncrementPrefix } from "../../helper";
import { addVoucherSchema, deleteVoucherSchema, editVoucherSchema, getVoucherSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addVoucher = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addVoucherSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate party (customer/supplier) for Payment/Receipt
    if ((value.type === VOUCHAR_TYPE.PAYMENT || value.type === VOUCHAR_TYPE.RECEIPT) && value.partyId) {
      if (!(await checkIdExist(contactModel, value.partyId, "party", res))) return;
    }

    // Validations removed for bank account and account entries

    // Generate voucher number if not provided
    if (!value.voucherNo) {
      const typeMap: { [key: string]: string } = {
        [VOUCHAR_TYPE.PAYMENT]: PREFIX_MODULES.PAYMENT,
        [VOUCHAR_TYPE.RECEIPT]: PREFIX_MODULES.RECEIPT,
        [VOUCHAR_TYPE.EXPENSE]: PREFIX_MODULES.EXPENSE,
        [VOUCHAR_TYPE.JOURNAL]: PREFIX_MODULES.JOURNAL_VOUCHER,
        [VOUCHAR_TYPE.CONTRA]: PREFIX_MODULES.CONTRA_VOUCHER,
      };

      const prefixType = typeMap[value.type] || PREFIX_MODULES.RECEIPT; // Defaulting to Receipt if unknown

      value.voucherNo = await getAndIncrementPrefix({
        companyId: value.companyId,
        prefixType: prefixType
      });
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(voucherModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Voucher"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editVoucher = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editVoucherSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(voucherModel, { _id: value?.voucherId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Voucher"), {}, {}));
    }

    const voucherType = value.type || isExist.type;

    // Validate party if being changed
    if (value.partyId && (voucherType === VOUCHAR_TYPE.PAYMENT || voucherType === VOUCHAR_TYPE.RECEIPT)) {
      if (!(await checkIdExist(contactModel, value.partyId, "party", res))) return;
    }

    // Validations removed for bank account and account entries

    value.updatedBy = user?._id || null;

    const response = await updateData(voucherModel, { _id: value?.voucherId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Voucher"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Voucher"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteVoucher = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteVoucherSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(voucherModel, value?.id, "Voucher", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(voucherModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Voucher"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Voucher"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllVoucher = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, type, startDate, endDate, activeFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (type) {
      criteria.type = type;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ voucherNo: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "date");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "partyId", select: "firstName lastName companyName" },
        { path: "createdBy", select: "fullName userType" },
        { path: "updatedBy", select: "name userType" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(voucherModel, criteria, {}, options);
    const totalData = await countData(voucherModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Voucher"), { voucher_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneVoucher = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getVoucherSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      voucherModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "partyId", select: "firstName lastName companyName email phoneNo address" },
          { path: "createdBy", select: "fullName userType" },
          { path: "updatedBy", select: "name userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Voucher"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Voucher"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Convenience methods for specific voucher types
export const addPayment = async (req, res) => {
  req.body.type = VOUCHAR_TYPE.PAYMENT;

  return addVoucher(req, res);
};

export const addReceipt = async (req, res) => {
  req.body.type = VOUCHAR_TYPE.RECEIPT;
  return addVoucher(req, res);
};

export const addExpense = async (req, res) => {
  req.body.type = VOUCHAR_TYPE.EXPENSE;
  return addVoucher(req, res);
};

export const getAllPayment = async (req, res) => {
  req.query.type = VOUCHAR_TYPE.PAYMENT;
  return getAllVoucher(req, res);
};

export const getAllReceipt = async (req, res) => {
  req.query.type = VOUCHAR_TYPE.RECEIPT;
  return getAllVoucher(req, res);
};

export const getAllExpense = async (req, res) => {
  req.query.type = VOUCHAR_TYPE.EXPENSE;
  return getAllVoucher(req, res);
};
