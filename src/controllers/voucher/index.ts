import { HTTP_STATUS, VOUCHAR_TYPE } from "../../common";
import { apiResponse } from "../../common/utils";
import { contactModel, accountModel } from "../../database";
import { voucherModel } from "../../database/model/voucher";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addVoucherSchema, deleteVoucherSchema, editVoucherSchema, getVoucherSchema } from "../../validation/voucher";

const ObjectId = require("mongoose").Types.ObjectId;

// Generate unique voucher number based on type
const generateVoucherNo = async (companyId: any, type: string): Promise<string> => {
  const count = await voucherModel.countDocuments({ companyId, type, isDeleted: false });
  const prefixMap: { [key: string]: string } = {
    [VOUCHAR_TYPE.PAYMENT]: "PAY",
    [VOUCHAR_TYPE.RECEIPT]: "REC",
    [VOUCHAR_TYPE.EXPENSE]: "EXP",
    [VOUCHAR_TYPE.JOURNAL]: "JRN",
    [VOUCHAR_TYPE.CONTRA]: "CNT",
  };
  const prefix = prefixMap[type] || "VCH";
  const number = String(count + 1).padStart(6, "0");
  return `${prefix}${number}`;
};

export const addVoucher = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = addVoucherSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    // Validate party (customer/supplier) for Payment/Receipt
    if ((value.type === VOUCHAR_TYPE.PAYMENT || value.type === VOUCHAR_TYPE.RECEIPT) && value.partyId) {
      if (!(await checkIdExist(contactModel, value.partyId, "party", res))) return;
    }

    // Validate bank account for Payment/Receipt/Expense
    if ((value.type === VOUCHAR_TYPE.PAYMENT || value.type === VOUCHAR_TYPE.RECEIPT || value.type === VOUCHAR_TYPE.EXPENSE) && value.bankAccountId) {
      if (!(await checkIdExist(accountModel, value.bankAccountId, "Account", res))) return;
    }

    // Validate account entries for Journal/Contra
    if ((value.type === VOUCHAR_TYPE.JOURNAL || value.type === VOUCHAR_TYPE.CONTRA) && value.entries && value.entries.length > 0) {
      for (const entry of value.entries) {
        if (!(await checkIdExist(accountModel, entry.accountId, "Account", res))) return;
      }
    }

    // Generate voucher number if not provided
    if (!value.voucherNo) {
      value.voucherNo = await generateVoucherNo(companyId, value.type);
    }

    const voucherData = {
      ...value,
      companyId,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(voucherModel, voucherData);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Voucher"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
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

    // Validate bank account if being changed
    if (value.bankAccountId && (voucherType === VOUCHAR_TYPE.PAYMENT || voucherType === VOUCHAR_TYPE.RECEIPT || voucherType === VOUCHAR_TYPE.EXPENSE)) {
      if (!(await checkIdExist(accountModel, value.bankAccountId, "Account", res))) return;
    }

    // Validate account entries if being updated
    if ((voucherType === VOUCHAR_TYPE.JOURNAL || voucherType === VOUCHAR_TYPE.CONTRA) && value.entries && value.entries.length > 0) {
      for (const entry of value.entries) {
        if (!(await checkIdExist(accountModel, entry.accountId, "Account", res))) return;
      }
    }

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
    let { page = 1, limit = 10, search, type, startDate, endDate, activeFilter } = req.query;

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

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.date = { $gte: start, $lte: end };
      }
    }

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "partyId", select: "firstName lastName companyName" },
        { path: "bankAccountId", select: "name" },
        { path: "entries.accountId", select: "name code" },
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
          { path: "partyId", select: "firstName lastName companyName email phoneNo addressDetails" },
          { path: "bankAccountId", select: "name code type currentBalance" },
          { path: "entries.accountId", select: "name code type currentBalance" },
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
