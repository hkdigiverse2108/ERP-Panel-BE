import { PosPaymentModel, PosOrderModel, contactModel } from "../../database";
import { apiResponse, HTTP_STATUS, PAY_LATER_STATUS, POS_ORDER_STATUS, POS_PAYMENT_STATUS, POS_PAYMENT_TYPE, POS_VOUCHER_TYPE } from "../../common";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, updateData, responseMessage, generateSequenceNumber, applyDateFilter } from "../../helper";
import { addPosPaymentSchema, editPosPaymentSchema, getPosPaymentSchema, deletePosPaymentSchema, getAllPosPaymentSchema } from "../../validation";

export const addPosPayment = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = addPosPaymentSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }


    value.companyId = await checkCompany(user, value);
    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    if (value.posOrderId && !(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
    if (value.partyId && !(await checkIdExist(contactModel, value.partyId, "Party", res))) return;

    let prefix = "PAY";
    if (value.voucherType === POS_VOUCHER_TYPE.SALES) prefix = "SAL";
    else if (value.voucherType === POS_VOUCHER_TYPE.PURCHASE) prefix = "PMT";
    else if (value.voucherType === POS_VOUCHER_TYPE.EXPENSE) prefix = "EXP";

    value.paymentNo = await generateSequenceNumber({ model: PosPaymentModel, prefix, fieldName: "paymentNo", companyId: value.companyId });

    if (value.voucherType === POS_VOUCHER_TYPE.SALES && value.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      const posOrder = await getFirstMatch(PosOrderModel, { _id: value.posOrderId, isDeleted: false }, {}, {});
      if (!posOrder) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
      }

      posOrder.multiplePayments.push({
        amount: value.amount,
        method: value.paymentMode,
        accountId: value.accountId,
      });

      posOrder.paidAmount = (posOrder.paidAmount || 0) + value.amount;
      if (posOrder.paidAmount >= posOrder.totalAmount) {
        posOrder.paymentStatus = POS_PAYMENT_STATUS.PAID;
        posOrder.status = POS_ORDER_STATUS.COMPLETED;
        posOrder.payLater.status = PAY_LATER_STATUS.SETTLED;
        posOrder.payLater.settledDate = new Date();
        posOrder.payLater.sendReminder = false;
        posOrder.dueAmount = 0;
      } else if (posOrder.paidAmount < posOrder.totalAmount) {
        posOrder.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
        posOrder.status = POS_ORDER_STATUS.PENDING;
        posOrder.payLater.status = PAY_LATER_STATUS.PARTIAL;
        posOrder.dueAmount = posOrder.totalAmount - posOrder.paidAmount;
      } else {
        posOrder.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
        posOrder.status = POS_ORDER_STATUS.PENDING;
        posOrder.payLater.status = PAY_LATER_STATUS.OPEN;
        posOrder.dueAmount = posOrder.totalAmount;
      }
      await updateData(PosOrderModel, { _id: value.posOrderId }, posOrder, {});
    }



    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(PosPaymentModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("POS Payment"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editPosPayment = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = editPosPaymentSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PosPaymentModel, { _id: value?.posPaymentId, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Payment"), {}, {}));
    }

    if (value.posOrderId && value.posOrderId !== isExist.posOrderId?.toString()) {
      if (!(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
    }

    if (value.partyId && value.partyId !== isExist.partyId?.toString()) {
      if (!(await checkIdExist(contactModel, value.partyId, "Party", res))) return;
    }

    if (value.voucherType === POS_VOUCHER_TYPE.SALES) {
      const posOrder = await getFirstMatch(PosOrderModel, { _id: value.posOrderId, isDeleted: false }, {}, {});
      if (!posOrder) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
      }

      posOrder.multiplePayments.push({
        amount: value.amount,
        method: value.paymentMode,
        accountId: value.accountId,
      });

      posOrder.paidAmount = (posOrder.paidAmount || 0) + value.amount;
      if (posOrder.paidAmount >= posOrder.totalAmount) {
        posOrder.paymentStatus = POS_PAYMENT_STATUS.PAID;
        posOrder.status = POS_ORDER_STATUS.COMPLETED;
        posOrder.payLater.status = PAY_LATER_STATUS.SETTLED;
        posOrder.payLater.settledDate = new Date();
        posOrder.payLater.sendReminder = false;
        posOrder.dueAmount = 0;
      } else if (posOrder.paidAmount < posOrder.totalAmount) {
        posOrder.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
        posOrder.status = POS_ORDER_STATUS.PENDING;
        posOrder.payLater.status = PAY_LATER_STATUS.PARTIAL;
        posOrder.dueAmount = posOrder.totalAmount - posOrder.paidAmount;
      } else {
        posOrder.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
        posOrder.status = POS_ORDER_STATUS.PENDING;
        posOrder.payLater.status = PAY_LATER_STATUS.OPEN;
        posOrder.dueAmount = posOrder.totalAmount;
      }
      await updateData(PosOrderModel, { _id: value.posOrderId }, posOrder, {});
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(PosPaymentModel, { _id: value?.posPaymentId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("POS Payment"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("POS Payment"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPosPayment = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page, limit, search, posOrderFilter, voucherTypeFilter, paymentTypeFilter, startDate, endDate, companyFilter, partyFilter } = req.query;
    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) criteria.companyId = companyId;
    if (posOrderFilter) criteria.posOrderId = posOrderFilter;
    if (voucherTypeFilter) criteria.voucherType = voucherTypeFilter;
    if (paymentTypeFilter) criteria.paymentType = paymentTypeFilter;
    if (partyFilter) criteria.partyId = partyFilter;
    if (companyFilter) criteria.companyId = companyId;


    if (search) {
      criteria.paymentNo = { $regex: search, $options: "si" };
    }

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "posOrderId", select: "orderNo totalAmount createdAt paidAmount" },
        { path: "partyId", select: "firstName lastName companyName" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(PosPaymentModel, criteria, {}, options);
    const totalData = await countData(PosPaymentModel, criteria);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Payment"), { posPayment_data: response, totalData, state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 } }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOnePosPayment = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPosPaymentSchema.validate(req.params);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      PosPaymentModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "posOrderId", select: "orderNo totalAmount items" },
          { path: "partyId", select: "firstName lastName companyName email phoneNo" },
          { path: "purchaseBillId", select: "documentNo totalAmount" },
          { path: "accountId", select: "name" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Payment"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Payment"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deletePosPayment = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = deletePosPaymentSchema.validate(req.params);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PosPaymentModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Payment"), {}, {}));
    }

    const response = await updateData(PosPaymentModel, { _id: value?.id }, { isDeleted: true }, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("POS Payment"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("POS Payment"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
