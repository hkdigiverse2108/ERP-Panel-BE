import { apiResponse, HTTP_STATUS, PAYLATER_STATUS, PAYMENT_MODE, POS_ORDER_STATUS, POS_PAYMENT_STATUS, POS_PAYMENT_TYPE, POS_RECEIPT_TYPE, POS_VOUCHER_TYPE, VOUCHAR_TYPE } from "../../common";
import { contactModel, productModel, taxModel, branchModel, InvoiceModel, PosOrderModel, PosCashControlModel, voucherModel, additionalChargeModel, accountGroupModel, PayLaterModel, PosPaymentModel, userModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, generateSequenceNumber, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addPosOrderSchema, deletePosOrderSchema, editPosOrderSchema, getPosOrderSchema, holdPosOrderSchema, releasePosOrderSchema, convertToInvoiceSchema, getPosCashControlSchema, updatePosCashControlSchema, getCustomerLoyaltyPointsSchema, redeemLoyaltyPointsSchema, getCombinedPaymentsSchema, getCustomerPosDetailsSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addPosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    if (value.branchId && !(await checkIdExist(branchModel, value.branchId, "Branch", res))) return;
    if (value.payLaterId && !(await checkIdExist(PayLaterModel, value.payLaterId, "Pay Later", res))) return;
    if (value.salesManId && !(await checkIdExist(userModel, value.salesManId, "Sales Man", res))) return;

    // Get customer name if customer provided
    if (value.customerId) {
      const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customer) {
        value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
      }
    }

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    for (const item of value.additionalCharges) {
      if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
      if (!(await checkIdExist(accountGroupModel, item.accountGroupId, "Account Group", res))) return;
      if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    value.orderNo = await generateSequenceNumber({ model: PosOrderModel, prefix: "POS", fieldName: "orderNo", companyId: value.companyId });

    // Set hold date if status is hold
    if (value.status === POS_ORDER_STATUS.HOLD) {
      value.holdDate = new Date();
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    // Calculate paid amount from multiple payments if provided
    if (value.multiplePayments && value.multiplePayments.length > 0) {
      value.paidAmount = value.multiplePayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    }

    // Set payment status based on paid amount
    if (value.paidAmount >= value.totalAmount) {
      value.paymentStatus = POS_PAYMENT_STATUS.PAID;
      value.status = POS_ORDER_STATUS.COMPLETED;
    } else if (value.paidAmount > 0 && value.paidAmount < value.totalAmount) {
      value.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
    } else {
      value.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
    }

    const response = await createOne(PosOrderModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    // Sync with PayLater or create if balance exists
    let payLaterId = response.payLaterId;
    const dueAmount = Math.max(0, response.totalAmount - (response.paidAmount || 0));

    if (!payLaterId && dueAmount > 0) {
      const payLaterData = {
        companyId: response.companyId,
        branchId: response.branchId,
        customerId: response.customerId,
        posOrderId: response._id,
        totalAmount: response.totalAmount,
        paidAmount: response.paidAmount || 0,
        dueAmount: dueAmount,
        status: (response.paidAmount || 0) > 0 ? PAYLATER_STATUS.PARTIAL : PAYLATER_STATUS.OPEN,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };
      const newPayLater = await createOne(PayLaterModel, payLaterData);
      if (newPayLater) {
        payLaterId = newPayLater._id;
        await updateData(PosOrderModel, { _id: response._id }, { payLaterId: newPayLater._id }, {});
      }
    } else if (payLaterId) {
      const payLater = await getFirstMatch(PayLaterModel, { _id: payLaterId, isDeleted: false }, {}, {});
      if (payLater) {
        payLater.posOrderId = response._id;
        payLater.totalAmount = response.totalAmount;
        payLater.paidAmount = response.paidAmount || 0;
        payLater.dueAmount = dueAmount;
        payLater.status = payLater.dueAmount <= 0 ? PAYLATER_STATUS.SETTLED : payLater.paidAmount > 0 ? PAYLATER_STATUS.PARTIAL : PAYLATER_STATUS.OPEN;
        await updateData(PayLaterModel, { _id: payLaterId }, payLater, {});
      }
    }

    // Add payment entry (multiple entries if multiplePayments provided)
    if (value.multiplePayments && value.multiplePayments.length > 0) {
      for (const payment of value.multiplePayments) {
        if (payment.amount > 0) {
          const paymentData = {
            companyId: response.companyId,
            branchId: response.branchId,
            posOrderId: response._id,
            partyId: response.customerId,
            amount: payment.amount,
            paymentMode: payment.method,
            voucherType: POS_VOUCHER_TYPE.SALES,
            paymentType: POS_PAYMENT_TYPE.AGAINST_BILL,
            paymentNo: await generateSequenceNumber({ model: PosPaymentModel, prefix: "RCP", fieldName: "paymentNo", companyId: response.companyId }),
            createdBy: user?._id || null,
            updatedBy: user?._id || null,
          };
          await createOne(PosPaymentModel, paymentData);
        }
      }
    } else if (response.paidAmount > 0) {
      const paymentData = {
        companyId: response.companyId,
        branchId: response.branchId,
        posOrderId: response._id,
        partyId: response.customerId,
        amount: response.paidAmount,
        paymentMode: value.paymentMethod || PAYMENT_MODE.CASH,
        voucherType: POS_VOUCHER_TYPE.SALES,
        paymentType: POS_PAYMENT_TYPE.AGAINST_BILL,
        paymentNo: await generateSequenceNumber({ model: PosPaymentModel, prefix: "RCP", fieldName: "paymentNo", companyId: response.companyId }),
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };
      await createOne(PosPaymentModel, paymentData);
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editPosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PosOrderModel, { _id: value?.posOrderId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    if (value.payLaterId && !(await checkIdExist(PayLaterModel, value.payLaterId, "Pay Later", res))) return;
    if (value.salesManId && !(await checkIdExist(userModel, value.salesManId, "Sales Man", res))) return;

    // Validate customer if being changed
    if (value.customerId && value.customerId !== isExist.customerId?.toString()) {
      if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
      const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customer) {
        value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
      }
    }

    // Validate products exist

    if (value?.items) {
      for (const item of value?.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      }
    }

    if (value?.additionalCharges) {
      for (const item of value.additionalCharges) {
        if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
        if (!(await checkIdExist(accountGroupModel, item.accountGroupId, "Account Group", res))) return;
        if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      }
    }

    // Update hold date if status is being changed to hold
    if (value.status === POS_ORDER_STATUS.HOLD && isExist.status !== POS_ORDER_STATUS.HOLD) {
      value.holdDate = new Date();
    }

    value.updatedBy = user?._id || null;

    // Handle payment logic for edit
    const totalAmount = value.totalAmount !== undefined ? value.totalAmount : isExist.totalAmount;
    const oldPaidAmount = isExist.paidAmount || 0;

    let newPaidAmount = oldPaidAmount;
    let paymentDiff = 0;

    if (value.multiplePayments && value.multiplePayments.length > 0) {
      paymentDiff = value.multiplePayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      newPaidAmount = oldPaidAmount + paymentDiff;
      value.paidAmount = newPaidAmount;
    } else if (value.paidAmount !== undefined) {
      newPaidAmount = value.paidAmount;
      paymentDiff = newPaidAmount - oldPaidAmount;
    }

    if (newPaidAmount >= totalAmount) {
      value.paymentStatus = POS_PAYMENT_STATUS.PAID;
      value.status = POS_ORDER_STATUS.COMPLETED;
    } else if (newPaidAmount > 0 && newPaidAmount < totalAmount) {
      value.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
    } else {
      value.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
    }

    const response = await updateData(PosOrderModel, { _id: value?.posOrderId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("POS Order"), {}, {}));
    }

    // Add payment entry if there's a difference
    if (paymentDiff > 0) {
      if (value.multiplePayments && value.multiplePayments.length > 0) {
        for (const payment of value.multiplePayments) {
          if (payment.amount > 0) {
            const paymentData = {
              companyId: response.companyId,
              branchId: response.branchId,
              posOrderId: response._id,
              partyId: response.customerId,
              amount: payment.amount,
              paymentMode: payment.method,
              voucherType: POS_VOUCHER_TYPE.SALES,
              paymentType: POS_PAYMENT_TYPE.AGAINST_BILL,
              paymentNo: await generateSequenceNumber({ model: PosPaymentModel, prefix: "RCP", fieldName: "paymentNo", companyId: response.companyId }),
              createdBy: user?._id || null,
              updatedBy: user?._id || null,
            };
            await createOne(PosPaymentModel, paymentData);
          }
        }
      } else {
        const paymentData = {
          companyId: response.companyId,
          branchId: response.branchId,
          posOrderId: response._id,
          partyId: response.customerId,
          amount: paymentDiff,
          paymentMode: value.paymentMethod || PAYMENT_MODE.CASH,
          voucherType: POS_VOUCHER_TYPE.SALES,
          paymentType: POS_PAYMENT_TYPE.AGAINST_BILL,
          paymentNo: await generateSequenceNumber({ model: PosPaymentModel, prefix: "RCP", fieldName: "paymentNo", companyId: response.companyId }),
          createdBy: user?._id || null,
          updatedBy: user?._id || null,
        };
        await createOne(PosPaymentModel, paymentData);
      }
    }

    // Sync with PayLater or create if balance exists
    let payLaterId = value.payLaterId || response.payLaterId;
    const dueAmount = Math.max(0, response.totalAmount - (response.paidAmount || 0));

    if (!payLaterId && dueAmount > 0) {
      const payLaterData = {
        companyId: response.companyId,
        branchId: response.branchId,
        customerId: response.customerId,
        posOrderId: response._id,
        totalAmount: response.totalAmount,
        paidAmount: response.paidAmount || 0,
        dueAmount: dueAmount,
        status: (response.paidAmount || 0) > 0 ? PAYLATER_STATUS.PARTIAL : PAYLATER_STATUS.OPEN,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };
      const newPayLater = await createOne(PayLaterModel, payLaterData);
      if (newPayLater) {
        payLaterId = newPayLater._id;
        await updateData(PosOrderModel, { _id: response._id }, { payLaterId: newPayLater._id }, {});
      }
    } else if (payLaterId) {
      const payLater = await getFirstMatch(PayLaterModel, { _id: payLaterId, isDeleted: false }, {}, {});
      if (payLater) {
        payLater.posOrderId = response._id;
        payLater.totalAmount = response.totalAmount;
        payLater.paidAmount = response.paidAmount || 0;
        payLater.dueAmount = dueAmount;
        payLater.status = payLater.dueAmount <= 0 ? PAYLATER_STATUS.SETTLED : payLater.paidAmount > 0 ? PAYLATER_STATUS.PARTIAL : PAYLATER_STATUS.OPEN;
        await updateData(PayLaterModel, { _id: payLaterId }, payLater, {});
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const holdPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = holdPosOrderSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PosOrderModel, { _id: value?.posOrderId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    if (isExist?.status === POS_ORDER_STATUS.HOLD) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.posAlreadyOnHold, {}, {}));
    }

    const payload = {
      status: POS_ORDER_STATUS.HOLD,
      holdDate: new Date(),
      updatedBy: user?._id || null,
    };

    const response = await updateData(PosOrderModel, { _id: value?.posOrderId }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Hold POS Order"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "POS Order put on hold successfully", response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const releasePosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = releasePosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(PosOrderModel, { _id: value?.posOrderId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    if (isExist.status !== POS_ORDER_STATUS.HOLD) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Order is not on hold", {}, {}));
    }

    const payload = {
      status: POS_ORDER_STATUS.PENDING,
      updatedBy: user?._id || null,
    };

    const response = await updateData(PosOrderModel, { _id: value?.posOrderId }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("POS Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "POS Order released from hold successfully", response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deletePosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deletePosOrderSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(PosOrderModel, value?.id, "POS Order", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(PosOrderModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("POS Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page = 1, limit = 10, search, activeFilter, companyFilter, statusFilter, paymentStatusFilter, branchFilter, tableNoFilter, startDate, endDate } = req.query;

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
      criteria.$or = [{ orderNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }, { tableNo: { $regex: search, $options: "si" } }];
    }

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    if (paymentStatusFilter) {
      criteria.paymentStatus = paymentStatusFilter;
    }

    if (branchFilter) {
      criteria.branchId = branchFilter;
    }

    if (tableNoFilter) {
      criteria.tableNo = tableNoFilter;
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
        { path: "branchId", select: "name" },
        { path: "companyId", select: "name" },
        { path: "payLaterId", select: "dueAmount status" },
        { path: "salesManId", select: "fullName" },
        { path: "customerId", select: "firstName lastName companyName email phoneNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "invoiceId", select: "documentNo" },
        { path: "additionalCharges.taxId", select: "name percentage" },
        { path: "additionalCharges.chargeId", select: "name" },
        { path: "additionalCharges.accountGroupId", select: "name" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(PosOrderModel, criteria, {}, options);
    const totalData = await countData(PosOrderModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Order"), { posOrder_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOnePosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPosOrderSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      PosOrderModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "branchId", select: "name" },
          { path: "companyId", select: "name" },
          { path: "payLaterId", select: "dueAmount status" },
          { path: "salesManId", select: "fullName" },
          { path: "customerId", select: "firstName lastName companyName email phoneNo" },
          { path: "items.productId", select: "name itemCode" },
          { path: "invoiceId", select: "documentNo" },
          { path: "additionalCharges.taxId", select: "name percentage" },
          { path: "additionalCharges.chargeId", select: "name" },
          { path: "additionalCharges.accountGroupId", select: "name" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
// Get all hold orders
export const getAllHoldOrders = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { search } = req.query;

    let criteria: any = { isDeleted: false, status: POS_ORDER_STATUS.HOLD };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (search) {
      criteria.$or = [{ orderNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }, { tableNo: { $regex: search, $options: "si" } }];
    }

    const options = {
      sort: { holdDate: -1 },
      populate: [
        { path: "branchId", select: "name" },
        { path: "companyId", select: "name" },
        { path: "salesManId", select: "fullName" },
        { path: "customerId", select: "firstName lastName companyName" },
        { path: "items.productId", select: "-isDeleted -isActive -createdAt -updatedAt -createdBy -updatedBy -images -nutrition" },
      ],
      limit: 100,
    };

    const response = await getDataWithSorting(PosOrderModel, criteria, {}, options);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Hold Orders"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getPosCashControl = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = getPosCashControlSchema.validate(req.query);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { branchId, date } = value;

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    // Validate Branch
    if (!(await checkIdExist(branchModel, branchId, "Branch", res))) return;

    // Use today's date if not provided
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Find or create cash control for the day
    let cashControl = await getFirstMatch(
      PosCashControlModel,
      { companyId, branchId, date: targetDate, isDeleted: false },
      {},
      {
        populate: [
          { path: "branchId", select: "name" },
          { path: "closedBy", select: "firstName lastName" },
        ],
      },
    );

    // If not found, create a new one with default values
    if (!cashControl) {
      // Get yesterday's closing cash as today's opening cash
      const yesterday = new Date(targetDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayCash = await getFirstMatch(PosCashControlModel, { companyId, branchId, date: yesterday, isDeleted: false }, {}, {});

      const cashControlData = {
        companyId,
        branchId,
        date: targetDate,
        openingCash: yesterdayCash?.closingCash || 0,
        closingCash: 0,
        expectedCash: yesterdayCash?.closingCash || 0,
        actualCash: 0,
        difference: 0,
        isClosed: false,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };

      cashControl = await createOne(PosCashControlModel, cashControlData);
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Cash Control"), cashControl, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const updatePosCashControl = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = updatePosCashControlSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { branchId, date, openingCash, actualCash, notes, isClosed } = value;

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    if (!branchId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Branch ID is required", {}, {}));
    }

    // Validate Branch
    if (!(await checkIdExist(branchModel, branchId, "Branch", res))) return;

    // Use today's date if not provided
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Find existing cash control
    let cashControl = await getFirstMatch(PosCashControlModel, { companyId, branchId, date: targetDate, isDeleted: false }, {}, {});

    if (!cashControl) {
      // Create new if doesn't exist
      const cashControlData = {
        companyId,
        branchId,
        date: targetDate,
        openingCash: openingCash || 0,
        actualCash: actualCash || 0,
        notes: notes || "",
        isClosed: isClosed || false,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };

      cashControl = await createOne(PosCashControlModel, cashControlData);
    } else {
      // Update existing
      const updateDataPayload: any = {
        updatedBy: user?._id || null,
      };

      if (openingCash !== undefined) updateDataPayload.openingCash = openingCash;
      if (actualCash !== undefined) updateDataPayload.actualCash = actualCash;
      if (notes !== undefined) updateDataPayload.notes = notes;
      if (isClosed !== undefined) {
        updateDataPayload.isClosed = isClosed;
        if (isClosed) {
          updateDataPayload.closedBy = user?._id || null;
          updateDataPayload.closedAt = new Date();
        }
      }

      // Calculate expected cash (opening + sales - expenses)
      // Get total sales for the day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const salesResult = await PosOrderModel.aggregate([
        {
          $match: {
            companyId: new ObjectId(companyId),
            branchId: new ObjectId(branchId),
            date: { $gte: startOfDay, $lte: endOfDay },
            paymentMethod: "cash",
            paymentStatus: "paid",
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]);

      const totalSales = salesResult.length > 0 ? salesResult[0].total : 0;

      // Get total expenses for the day
      const expensesResult = await voucherModel.aggregate([
        {
          $match: {
            companyId: new ObjectId(companyId),
            type: VOUCHAR_TYPE.EXPENSE,
            date: { $gte: startOfDay, $lte: endOfDay },
            bankAccountId: { $exists: true }, // Cash account
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const totalExpenses = expensesResult.length > 0 ? expensesResult[0].total : 0;

      const opening = updateDataPayload.openingCash !== undefined ? updateDataPayload.openingCash : cashControl.openingCash;
      updateDataPayload.expectedCash = opening + totalSales - totalExpenses;
      updateDataPayload.closingCash = updateDataPayload.actualCash !== undefined ? updateDataPayload.actualCash : cashControl.actualCash;
      updateDataPayload.difference = updateDataPayload.expectedCash - updateDataPayload.closingCash;

      cashControl = await updateData(PosCashControlModel, { _id: cashControl._id }, updateDataPayload, {});
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("POS Cash Control"), cashControl, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getCustomerLoyaltyPoints = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getCustomerLoyaltyPointsSchema.validate(req.query);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { customerId } = value;

    if (!customerId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Customer ID is required", {}, {}));
    }

    // Validate customer
    if (!(await checkIdExist(contactModel, customerId, "Customer", res))) return;

    const customer = await getFirstMatch(contactModel, { _id: customerId, isDeleted: false }, {}, {});

    if (!customer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Customer"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Customer Loyalty Points"), { customerId: customer._id, loyaltyPoints: customer.loyaltyPoints || 0 }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const redeemLoyaltyPoints = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = redeemLoyaltyPointsSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { customerId, pointsToRedeem, discountAmount } = value;

    if (!customerId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Customer ID is required", {}, {}));
    }

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Points to redeem must be greater than 0", {}, {}));
    }

    // Validate customer
    if (!(await checkIdExist(contactModel, customerId, "Customer", res))) return;

    const customer = await getFirstMatch(contactModel, { _id: customerId, isDeleted: false }, {}, {});

    if (!customer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Customer"), {}, {}));
    }

    const currentPoints = customer.loyaltyPoints || 0;

    if (currentPoints < pointsToRedeem) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Insufficient loyalty points", {}, {}));
    }

    // Deduct loyalty points
    const newPoints = currentPoints - pointsToRedeem;
    const updatedCustomer = await updateData(contactModel, { _id: customerId }, { loyaltyPoints: newPoints, updatedBy: user?._id || null }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Loyalty points redeemed successfully", { customerId: customer._id, redeemedPoints: pointsToRedeem, remainingPoints: newPoints, discountAmount: discountAmount || 0 }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getCombinedPayments = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = getCombinedPaymentsSchema.validate(req.query);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let { page = 1, limit = 10, search, startDate, endDate, branchId } = value;

    page = Number(page);
    limit = Number(limit);

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    let criteria: any = {
      isDeleted: false,
      companyId,
      type: { $in: [VOUCHAR_TYPE.RECEIPT, VOUCHAR_TYPE.PAYMENT, VOUCHAR_TYPE.EXPENSE] },
    };

    if (search) {
      criteria.$or = [{ voucherNo: { $regex: search, $options: "si" } }, { notes: { $regex: search, $options: "si" } }];
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

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Payments"), { payments_data: response, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getCustomerPosDetails = async (req, res) => {
  try {
    reqInfo(req);

    const { error, value } = getCustomerPosDetailsSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }
    const { id } = value;

    const select = "firstName lastName  email phoneNo whatsappNo productDetails loyaltyPoints remarks status";

    const customer = await getFirstMatch(contactModel, { _id: id, isDeleted: false }, select, {});
    if (!customer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Customer"), {}, {}));
    }

    const payLater = await getDataWithSorting(PayLaterModel, { customerId: id, isDeleted: false }, {}, { sort: { createdAt: -1 } });
    const posOrders = await getDataWithSorting(PosOrderModel, { customerId: id, isDeleted: false }, {}, { sort: { createdAt: -1 } });

    const totalDueAmount = payLater.reduce((acc, item) => acc + Number(item.dueAmount || 0), 0);
    const totalPaidAmount = posOrders.reduce((acc, item) => acc + Number(item.paidAmount || 0), 0);
    const totalPurchaseAmount = posOrders.reduce((acc, item) => acc + Number(item.totalAmount || 0), 0);

    const { totalAmount = 0, orderNo = "-", _id = "-", paymentMethod = "-" } = posOrders?.[0] ?? {};

    const lastBill = { _id, totalAmount, orderNo, paymentMethod };

    const allPurchasedProduct = posOrders.reduce((acc, item) => {
      const product = item.items?.[0];
      if (product) {
        acc[product.productId] = (acc[product.productId] || 0) + 1;
      }
      return acc;
    }, {});

    const mostPurchasedProductId = Object.keys(allPurchasedProduct).reduce((maxProductId, productId) => {
      if (!maxProductId || allPurchasedProduct[productId] > allPurchasedProduct[maxProductId]) {
        return productId;
      }
      return maxProductId;
    }, null);

    let mostPurchasedProduct;
    if (mostPurchasedProductId) {
      mostPurchasedProduct = await getFirstMatch(productModel, { _id: mostPurchasedProductId, isDeleted: false }, "name", {});
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Customer POS Details"), { customer, totalDueAmount, totalPaidAmount, totalPurchaseAmount, lastBill, mostPurchasedProduct }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// ================================== Not used functions ==================================
export const convertToInvoice = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = convertToInvoiceSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const posOrder = await getFirstMatch(PosOrderModel, { _id: value?.posOrderId, isDeleted: false }, {}, {});

    if (!posOrder) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
    }

    // Create invoice from POS order
    // Note: Invoice requires customerId, so we need to handle walk-in customers
    // Option 1: Create a default "Walk-in Customer" contact
    // Option 2: Make customerId optional in invoice (but model requires it)
    // For now, we'll require customerId or use a default walk-in customer ID

    if (!posOrder.customerId) {
      // Try to find or create a default walk-in customer
      const walkInCustomer = await getFirstMatch(contactModel, { companyName: "Walk-in Customer", companyId: posOrder.companyId, isDeleted: false }, {}, {});
      if (!walkInCustomer) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Please create a default 'Walk-in Customer' contact for POS orders", {}, {}));
      }
      posOrder.customerId = walkInCustomer._id;
      posOrder.customerName = walkInCustomer.companyName || "Walk-in Customer";
    }

    const invoiceData = {
      documentNo: posOrder.orderNo.replace("POS", "INV"), // Convert order number to invoice number
      date: posOrder.date,
      customerId: posOrder.customerId,
      customerName: posOrder.customerName || "Walk-in Customer",
      items: posOrder.items,
      grossAmount: posOrder.grossAmount,
      discountAmount: posOrder.discountAmount,
      taxAmount: posOrder.taxAmount,
      roundOff: posOrder.roundOff,
      netAmount: posOrder.netAmount,
      paidAmount: posOrder.paidAmount,
      balanceAmount: posOrder.balanceAmount,
      paymentStatus: posOrder.paymentStatus,
      status: "active",
      notes: posOrder.notes,
      companyId: posOrder.companyId,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const invoice = await createOne(InvoiceModel, invoiceData);

    if (!invoice) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, "Failed to create invoice", {}, {}));
    }

    // Update POS order with invoice ID and mark as completed
    await updateData(
      PosOrderModel,
      { _id: value?.posOrderId },
      {
        invoiceId: invoice._id,
        status: "completed",
        updatedBy: user?._id || null,
      },
      {},
    );

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "POS Order converted to invoice successfully", { posOrder, invoice }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Quick add product by name (for POS)
export const quickAddProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { productName } = req.body;

    if (!productName) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Product name is required", {}, {}));
    }

    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let criteria: any = { isDeleted: false, isActive: true, name: { $regex: productName, $options: "si" } };
    if (companyId) {
      criteria.companyId = companyId;
    }

    const product = await getFirstMatch(
      productModel,
      criteria,
      {},
      {
        populate: [
          { path: "categoryId", select: "name" },
          { path: "salesTaxId", select: "name percentage" },
        ],
      },
    );

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Product not found", {}, {}));
    }

    // Return product in POS-friendly format
    const posProduct = {
      _id: product._id,
      name: product.name,
      itemCode: product.itemCode,
      sellingPrice: product.sellingPrice || 0,
      mrp: product.mrp || 0,
      uom: product.uom,
      taxId: product.taxId?._id || null,
      taxPercent: product.taxId?.percentage || 0,
      stock: product.stock || 0,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Product found", posProduct, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
