import {
  PosCashRegisterModel,
  bankModel,
  branchModel,
  CashControlModel,
  PosOrderModel,
  returnPosOrderModel,
  PosPaymentModel,
} from "../../database";
import {
  apiResponse,
  HTTP_STATUS,
  CASH_REGISTER_STATUS,
  CASH_CONTROL_TYPE,
  POS_VOUCHER_TYPE,
  PAYMENT_MODE,
  POS_ORDER_STATUS,
} from "../../common";
import mongoose from "mongoose";
import {
  checkCompany,
  checkIdExist,
  createOne,
  getFirstMatch,
  updateData,
  reqInfo,
  countData,
  getDataWithSorting,
  responseMessage,
  generateSequenceNumber,
  applyDateFilter,
} from "../../helper";
import {
  addPosCashRegisterSchema,
  editPosCashRegisterSchema,
  getPosCashRegisterSchema,
  deletePosCashRegisterSchema,
  getAllPosCashRegisterSchema,
  posCashRegisterDropDownSchema,
} from "../../validation";

export const addPosCashRegister = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = addPosCashRegisterSchema.validate(req.body);

    if (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0]?.message,
            {},
            {},
          ),
        );
    }

    value.companyId = await checkCompany(user, value);
    if (!value.companyId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            responseMessage?.fieldIsRequired("Company Id"),
            {},
            {},
          ),
        );
    }

    const existingOpenRegister = await getFirstMatch(
      PosCashRegisterModel,
      {
        companyId: value.companyId,
        status: CASH_REGISTER_STATUS.OPEN,
        isDeleted: false,
      },
      {},
      {},
    );

    if (existingOpenRegister) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            "An open register already exists for this company",
            {},
            {},
          ),
        );
    }

    value.createdBy = user?._id || null;
    value.salesManId = user?._id || null;
    value.updatedBy = user?._id || null;
    value.registerNo = await generateSequenceNumber({
      model: PosCashRegisterModel,
      prefix: "REG",
      fieldName: "registerNo",
      companyId: value.companyId,
    });

    const response = await createOne(PosCashRegisterModel, value);
    if (!response) {
      return res
        .status(HTTP_STATUS.NOT_IMPLEMENTED)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_IMPLEMENTED,
            responseMessage?.addDataError,
            {},
            {},
          ),
        );
    }

    await createOne(CashControlModel, {
      companyId: response.companyId,
      branchId: response.branchId,
      registerId: response._id,
      type: CASH_CONTROL_TYPE.OPENING,
      amount: response.openingCash,
      remark: "Opening Balance",
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    });

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.addDataSuccess("POS Cash Register"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error?.message || responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const editPosCashRegister = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = editPosCashRegisterSchema.validate(req.body);

    if (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0]?.message,
            {},
            {},
          ),
        );
    }

    if (
      value.branchId &&
      !(await checkIdExist(branchModel, value.branchId, "Branch", res))
    )
      return;
    if (
      value.bankAccountId &&
      !(await checkIdExist(bankModel, value.bankAccountId, "Bank", res))
    )
      return;

    const isExist = await getFirstMatch(
      PosCashRegisterModel,
      { _id: value?.posCashRegisterId, isDeleted: false },
      {},
      {},
    );
    if (!isExist) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage?.getDataNotFound("POS Cash Register"),
            {},
            {},
          ),
        );
    }

    if (isExist?.status === CASH_REGISTER_STATUS.CLOSED) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            "Register is already closed",
            {},
            {},
          ),
        );
    }

    if (!value.salesManId) {
      value.salesManId = user?._id || null;
    }

    if (value.status === CASH_REGISTER_STATUS.CLOSED) {
      const isPosHoldOrderExist = await getFirstMatch(
        PosOrderModel,
        {
          posCashRegisterId: isExist?._id,
          status: POS_ORDER_STATUS.HOLD,
          isDeleted: false,
          companyId: isExist?.companyId,
        },
        {},
        {},
      );
      if (isPosHoldOrderExist) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            new apiResponse(
              HTTP_STATUS.BAD_REQUEST,
              "First Settle the all hold orders",
              {},
              {},
            ),
          );
      }
    }

    value.updatedBy = user?._id || null;
    const response = await updateData(
      PosCashRegisterModel,
      { _id: value?.posCashRegisterId },
      value,
      {},
    );

    if (!response) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(
          new apiResponse(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            responseMessage?.updateDataError("POS Cash Register"),
            {},
            {},
          ),
        );
    }

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.updateDataSuccess("POS Cash Register"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error?.message || responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const getAllPosCashRegister = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    // const { error, value } = getAllPosCashRegisterSchema.validate(req.query);
    // if (error) {
    //   return res
    //     .status(HTTP_STATUS.BAD_REQUEST)
    //     .json(
    //       new apiResponse(
    //         HTTP_STATUS.BAD_REQUEST,
    //         error?.details[0]?.message,
    //         {},
    //         {},
    //       ),
    //     );
    // }

    let {
      page,
      limit,
      salesManFilter,
      companyFilter,
      branchFilter,
      statusFilter, 
      startDate,
      endDate,
    } = req.query;
    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) criteria.companyId = companyId;
    if (companyFilter) criteria.companyId = companyFilter;
    if (salesManFilter) criteria.salesManId = salesManFilter;
    if (branchFilter) criteria.branchId = branchFilter;
    if (statusFilter) criteria.status = statusFilter;

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
      populate: [
        { path: "branchId", select: "name" },
        { path: "companyId", select: "name" },
        { path: "salesManId", select: "fullName" },
        { path: "bankAccountId", select: "name" },
      ],
    };

    const response = await getDataWithSorting(
      PosCashRegisterModel,
      criteria,
      {},
      options,
    );
    const totalData = await countData(PosCashRegisterModel, criteria);

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("POS Cash Register"),
        {
          posCashRegister_data: response,
          totalData,
          state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 },
        },
        {},
      ),
    );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error?.message || responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const getOnePosCashRegister = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPosCashRegisterSchema.validate(req.params);
    if (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0]?.message,
            {},
            {},
          ),
        );
    }

    const response = await getFirstMatch(
      PosCashRegisterModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "branchId", select: "name" },
          { path: "companyId", select: "name" },
          { path: "salesManId", select: "fullName" },
          { path: "bankAccountId", select: "name" },
        ],
      },
    );

    if (!response) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage?.getDataNotFound("POS Cash Register"),
            {},
            {},
          ),
        );
    }

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.getDataSuccess("POS Cash Register"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error?.message || responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const deletePosCashRegister = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = deletePosCashRegisterSchema.validate(req.params);
    if (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0]?.message,
            {},
            {},
          ),
        );
    }

    const isExist = await getFirstMatch(
      PosCashRegisterModel,
      { _id: value?.id, isDeleted: false },
      {},
      {},
    );
    if (!isExist) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage?.getDataNotFound("POS Cash Register"),
            {},
            {},
          ),
        );
    }

    const response = await updateData(
      PosCashRegisterModel,
      { _id: value?.id },
      { isDeleted: true },
      {},
    );

    if (!response) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(
          new apiResponse(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            responseMessage?.deleteDataError("POS Cash Register"),
            {},
            {},
          ),
        );
    }

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.deleteDataSuccess("POS Cash Register"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error?.message || responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const posCashRegisterDropDown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = posCashRegisterDropDownSchema.validate(req.query);
    if (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            error?.details[0]?.message,
            {},
            {},
          ),
        );
    }

    const { branchId, status } = value;
    let criteria: any = { isDeleted: false, isActive: true };
    if (companyId) criteria.companyId = companyId;
    if (branchId) criteria.branchId = branchId;
    if (status) criteria.status = status;

    const response = await PosCashRegisterModel.find(criteria, {
      _id: 1,
      openingCash: 1,
      status: 1,
    })
      .populate({ path: "branchId", select: "name" })
      .sort({ createdAt: -1 })
      .limit(100);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.getDataSuccess("POS Cash Register Dropdown"),
          response,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error?.message || responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const getCashRegisterDetails = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const openRegister = await getFirstMatch(
      PosCashRegisterModel,
      {
        companyId: companyId,
        status: CASH_REGISTER_STATUS.OPEN,
        isDeleted: false,
      },
      {
        status: 1,
        openingCash: 1,
        createdAt: 1,
        creditAdvanceRedeemed: 1,
        registerNo: 1,
      },
      {},
    );

    if (!openRegister) {
      return res.status(HTTP_STATUS.OK).json(
        new apiResponse(
          HTTP_STATUS.OK,
          "No open cash register found",
          {
            status: CASH_REGISTER_STATUS.CLOSED,
          },
          {},
        ),
      );
    }

    const registerId = openRegister._id;
    const startTime = openRegister.createdAt;
    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // 1. Opening Cash and Added Cash from cashControl
    const cashControlData = await CashControlModel.aggregate([
      {
        $match: {
          registerId: registerId,
          isDeleted: false,
          type: { $in: [CASH_CONTROL_TYPE.OPENING, CASH_CONTROL_TYPE.ADD] },
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let openingCash = 0;
    let cashAdded = 0;
    cashControlData.forEach((c) => {
      if (c._id === CASH_CONTROL_TYPE.OPENING) openingCash = c.total;
      if (c._id === CASH_CONTROL_TYPE.ADD) cashAdded = c.total;
    });

    // 2. Payments from posPayment (Sales only)
    const paymentsData = await PosPaymentModel.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          $or: [{ posCashRegisterId: registerId }, { posCashRegisterId: null, createdAt: { $gte: startTime } }],
          voucherType: POS_VOUCHER_TYPE.SALES,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$paymentMode",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const payments = {
      cashPayment: 0,
      chequePayment: 0,
      cardPayment: 0,
      bankPayment: 0,
      upiPayment: 0,
    };
    paymentsData.forEach((p) => {
      if (p._id === PAYMENT_MODE.CASH) payments.cashPayment = p.total;
      if (p._id === PAYMENT_MODE.CHEQUE) payments.chequePayment = p.total;
      if (p._id === PAYMENT_MODE.CARD) payments.cardPayment = p.total;
      if (p._id === PAYMENT_MODE.BANK) payments.bankPayment = p.total;
      if (p._id === PAYMENT_MODE.UPI) payments.upiPayment = p.total;
    });

    // 3. Refunds from returnPosOrder
    const refundsData = await returnPosOrderModel.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          $or: [{ posCashRegisterId: registerId }, { posCashRegisterId: null, createdAt: { $gte: startTime } }],
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalReturn: { $sum: "$total" },
          cashRefund: { $sum: "$refundViaCash" },
          bankRefund: { $sum: "$refundViaBank" },
        },
      },
    ]);

    const refunds = {
      salesReturn: refundsData[0]?.totalReturn || 0,
      cashRefund: refundsData[0]?.cashRefund || 0,
      bankRefund: refundsData[0]?.bankRefund || 0,
    };

    // 4. Pos Order Summary (Total Sales, Pay Later, Counts, Discounts, Tax)
    const posOrdersSummary = await PosOrderModel.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          $or: [{ posCashRegisterId: registerId }, { posCashRegisterId: null, createdAt: { $gte: startTime } }],
          isDeleted: false,
          status: { $ne: POS_ORDER_STATUS.CANCELLED },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalPayLater: { $sum: "$dueAmount" },
          numberOfBills: { $sum: 1 },
          numberOfItems: { $sum: "$totalQty" },
          totalDiscount: { $sum: "$totalDiscount" },
          taxAmount: { $sum: "$totalTaxAmount" },
        },
      },
    ]);

    // 5. Other Expenses and Purchase Payments from posPayment
    const otherPayments = await PosPaymentModel.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          $or: [{ posCashRegisterId: registerId }, { posCashRegisterId: null, createdAt: { $gte: startTime } }],
          isDeleted: false,
          voucherType: {
            $in: [POS_VOUCHER_TYPE.EXPENSE, POS_VOUCHER_TYPE.PURCHASE],
          },
        },
      },
      {
        $group: {
          _id: { voucherType: "$voucherType", paymentMode: "$paymentMode" },
          total: { $sum: "$amount" },
        },
      },
    ]);

    let expense = 0;
    let purchasePayment = 0;
    let cashExpense = 0;
    let cashPurchase = 0;

    otherPayments.forEach((p) => {
      if (p._id.voucherType === POS_VOUCHER_TYPE.EXPENSE) {
        expense += p.total;
        if (p._id.paymentMode === PAYMENT_MODE.CASH) cashExpense += p.total;
      }
      if (p._id.voucherType === POS_VOUCHER_TYPE.PURCHASE) {
        purchasePayment += p.total;
        if (p._id.paymentMode === PAYMENT_MODE.CASH) cashPurchase += p.total;
      }
    });

    const totalCashInDrawer = openingCash + cashAdded + payments.cashPayment - refunds.cashRefund - cashExpense - cashPurchase;

    const result = {
      registerId: openRegister._id,
      registerNo: openRegister.registerNo,
      status: openRegister.status,
      createdAt: openRegister.createdAt,
      summary: {
        openingCash: openingCash + cashAdded,
        ...payments,
        ...refunds,
        creditAdvanceRedeemed: openRegister.creditAdvanceRedeemed || 0,
        payLater: posOrdersSummary[0]?.totalPayLater || 0,
        expense: expense,
        purchasePayment: purchasePayment,
        totalSales: posOrdersSummary[0]?.totalSales || 0,
        numberOfBills: posOrdersSummary[0]?.numberOfBills || 0,
        numberOfItems: posOrdersSummary[0]?.numberOfItems || 0,
        totalDiscount: posOrdersSummary[0]?.totalDiscount || 0,
        taxAmount: posOrdersSummary[0]?.taxAmount || 0,
        totalCashInDrawer: totalCashInDrawer,
      },
    };

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.getDataSuccess("Cash Register Details"),
          result,
          {},
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        new apiResponse(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error?.message || responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};
