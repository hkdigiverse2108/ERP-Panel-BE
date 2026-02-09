import { PayLaterModel, contactModel, PosOrderModel } from "../../database";
import { apiResponse, HTTP_STATUS, PAYLATER_STATUS, POS_ORDER_STATUS, POS_PAYMENT_STATUS } from "../../common";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, updateData, deleteSingleRecord, responseMessage } from "../../helper";
import { addPayLaterSchema, editPayLaterSchema, getPayLaterSchema, deletePayLaterSchema, getAllPayLaterSchema } from "../../validation";

export const addPayLater = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = addPayLaterSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);
    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;

    if (value.posOrderId) {
      if (!(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
    }

    value.dueAmount = Math.max(value.totalAmount - value.paidAmount, 0);
    if (value.dueAmount === 0) {
      value.status = PAYLATER_STATUS.SETTLED;
    } else if (value.paidAmount > 0 && value.dueAmount > 0) {
      value.status = PAYLATER_STATUS.PARTIAL;
    } else {
      value.status = PAYLATER_STATUS.OPEN;
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(PayLaterModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("PayLater"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editPayLater = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = editPayLaterSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PayLaterModel, { _id: value?.payLaterId, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("PayLater"), {}, {}));
    }

    if (value.customerId && value.customerId !== isExist.customerId?.toString()) {
      if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
    }

    if (value.posOrderId && value.posOrderId !== isExist.posOrderId?.toString()) {
      if (!(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
    }

    const totalAmount = value.totalAmount !== undefined ? value.totalAmount : isExist.totalAmount;

    const paidAmount = value.paidAmount !== undefined ? value.paidAmount : isExist.paidAmount;

    if (value.totalAmount !== undefined || value.paidAmount !== undefined) {
      value.dueAmount = Math.max(totalAmount - paidAmount, 0);

      if (value.dueAmount === 0) {
        value.status = PAYLATER_STATUS.SETTLED;
        await updateData(PosOrderModel, { _id: isExist.posOrderId?._id }, { payLaterId: null, status: POS_ORDER_STATUS.COMPLETED, paymentStatus: POS_PAYMENT_STATUS.PAID, paidAmount: totalAmount }, {});
      } else if (paidAmount > 0) {
        value.status = PAYLATER_STATUS.PARTIAL;
        await updateData(PosOrderModel, { _id: isExist.posOrderId?._id }, { status: POS_ORDER_STATUS.COMPLETED, paymentStatus: POS_PAYMENT_STATUS.PARTIAL, paidAmount: paidAmount }, {});
      } else {
        value.status = PAYLATER_STATUS.OPEN;
        await updateData(PosOrderModel, { _id: isExist.posOrderId?._id }, { status: POS_ORDER_STATUS.PENDING, paymentStatus: POS_PAYMENT_STATUS.UNPAID, paidAmount: 0 }, {});
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(PayLaterModel, { _id: value?.payLaterId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("PayLater"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("PayLater"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPayLater = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { error, value } = getAllPayLaterSchema.validate(req.query);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let { page = 1, limit = 10, search, customerId, status, startDate, endDate } = value;
    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) criteria.companyId = companyId;
    if (customerId) criteria.customerId = customerId;
    if (status) criteria.status = status;

    if (search) {
      // Basic search on note for now, or other relevant fields
      criteria.note = { $regex: search, $options: "si" };
    }

    if (startDate && endDate) {
      criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "customerId", select: "firstName lastName companyName phoneNo" },
        { path: "posOrderId", select: "orderNo totalAmount" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(PayLaterModel, criteria, {}, options);
    const totalData = await countData(PayLaterModel, criteria);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("PayLater"), { payLater_data: response, totalData, state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 } }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOnePayLater = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPayLaterSchema.validate(req.params);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      PayLaterModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "customerId", select: "firstName lastName companyName phoneNo email" },
          { path: "posOrderId", select: "orderNo totalAmount items" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("PayLater"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("PayLater"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deletePayLater = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = deletePayLaterSchema.validate(req.params);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PayLaterModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("PayLater"), {}, {}));
    }

    const payLaterAssigned = await getFirstMatch(PosOrderModel, { payLaterId: value?.id }, {}, {});
    if (payLaterAssigned) {
      await updateData(PosOrderModel, { _id: payLaterAssigned?._id }, { payLaterId: null }, {});
    }

    // Permanent Delete as requested
    const response = await deleteSingleRecord(PayLaterModel, { _id: value?.id }, {}, {});

    if (!response || response.deletedCount === 0) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("PayLater"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("PayLater"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
