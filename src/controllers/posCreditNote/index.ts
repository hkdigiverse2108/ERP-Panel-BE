import { posCreditNoteModel, PosPaymentModel, stockModel } from "../../database";
import { apiResponse, HTTP_STATUS, REDEEM_CREDIT_TYPE, POS_PAYMENT_TYPE } from "../../common";
import { applyDateFilter, checkIdExist, countData, getDataWithSorting, getFirstMatch, handleIncludeId, reqInfo, responseMessage, updateData } from "../../helper";
import { getPosCreditNoteSchema, deletePosCreditNoteSchema, checkRedeemCreditSchema, refundPosCreditSchema } from "../../validation";
import { returnPosOrderModel, PosCashRegisterModel, bankModel } from "../../database";
import { CASH_REGISTER_STATUS, POS_CREDIT_NOTE_STATUS } from "../../common";
import { redisGet, redisSet, redisdelPattern } from "../../helper";

const ObjectId = require("mongoose").Types.ObjectId;

export const checkRedeemCredit = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = checkRedeemCreditSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { code, type, customerId } = value;
    let redeemableAmount = 0;
    let totalAmount = 0;
    let data: any = null;

    if (type === REDEEM_CREDIT_TYPE.CREDIT_NOTE) {
      data = await getFirstMatch(posCreditNoteModel, { creditNoteNo: code, isDeleted: false }, {}, {});
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Credit Note not found", {}, {}));
      }
      if (customerId && data.customerId?.toString() !== customerId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Credit Note does not belong to this customer", {}, {}));
      }
      totalAmount = data.totalAmount || 0;
      redeemableAmount = data.creditsRemaining || 0;
    } else if (type === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT) {
      data = await getFirstMatch(
        PosPaymentModel,
        {
          paymentNo: code,
          paymentType: POS_PAYMENT_TYPE.ADVANCE,
          isDeleted: false,
        },
        {},
        {},
      );
      if (!data) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Advance Payment not found", {}, {}));
      }
      if (customerId && data.partyId?.toString() !== customerId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Advance Payment does not belong to this customer", {}, {}));
      }
      redeemableAmount = data.amount || 0;
    }

    if (redeemableAmount <= 0) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "No redeemable credit available", { redeemableAmount: 0 }, {}));
    }

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        "Redeem credit verified successfully",
        {
          id: data._id,
          code: code,
          type: type,
          totalAmount: totalAmount,
          redeemableAmount: redeemableAmount,
          date: data.createdAt,
        },
        {},
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const refundPosCredit = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = refundPosCreditSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { posCreditNoteId, refundViaCash, refundViaBank, bankAccountId, refundDescription } = value;
    const totalRefund = (refundViaCash || 0) + (refundViaBank || 0);

    if (totalRefund <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Refund amount must be greater than zero", {}, {}));
    }

    const creditNote = await getFirstMatch(posCreditNoteModel, { _id: posCreditNoteId, isDeleted: false }, {}, {});
    if (!creditNote) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Credit Note"), {}, {}));
    }

    if (totalRefund > creditNote.creditsRemaining) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Refund amount exceeds available credits. Available: ${creditNote.creditsRemaining}`, {}, {}));
    }

    if (refundViaBank > 0 && !bankAccountId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Bank Account Id is required for bank refund", {}, {}));
    }

    if (bankAccountId && !(await checkIdExist(bankModel, bankAccountId, "Bank Account", res))) return;

    // Update Credit Note
    const updatedCreditNote = await posCreditNoteModel.findOneAndUpdate(
      { _id: posCreditNoteId },
      {
        $inc: { refundedAmount: totalRefund, creditsRemaining: -totalRefund },
        $set: { updatedBy: user?._id || null },
      },
      { new: true },
    );

    if (updatedCreditNote && updatedCreditNote.creditsRemaining <= 0) {
      await posCreditNoteModel.updateOne({ _id: posCreditNoteId }, { status: POS_CREDIT_NOTE_STATUS.USED });
    }

    // Update Return POS Order
    if (creditNote.returnPosOrderId) {
      const returnUpdate: any = {
        $set: {
          refundViaCash: refundViaCash || 0,
          refundViaBank: refundViaBank || 0,
          updatedBy: user?._id || null,
        },
      };
      if (bankAccountId) returnUpdate.$set.bankAccountId = bankAccountId;
      if (refundDescription) returnUpdate.$set.refundDescription = refundDescription;

      await returnPosOrderModel.findOneAndUpdate({ _id: creditNote.returnPosOrderId }, returnUpdate, { new: true });
    }

    // Update Cash Register
    const cashRegister = await getFirstMatch(
      PosCashRegisterModel,
      {
        companyId: user?.companyId?._id,
        branchId: user?.branchId?._id,
        status: CASH_REGISTER_STATUS.OPEN,
        isDeleted: false,
      },
      {},
      {},
    );

    if (cashRegister) {
      await PosCashRegisterModel.updateOne(
        { _id: cashRegister._id },
        {
          $inc: {
            cashRefund: refundViaCash || 0,
            bankRefund: refundViaBank || 0,
          },
        },
      );
    }

    await redisdelPattern("posCreditNote:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Credit Note refunded successfully", updatedCreditNote, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPosCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `posCreditNote:all:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note"), cachedData, {}));

    let { page, limit, search, customerFilter, startDate, endDate, companyFilter, branchFilter, statusFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) criteria.companyId = companyId;
    if (companyFilter) criteria.companyId = new ObjectId(companyFilter);
    if (branchId) criteria.branchId = branchId;
    if (branchFilter) criteria.branchId = new ObjectId(branchFilter);
    if (customerFilter) criteria.customerId = new ObjectId(customerFilter);
    if (statusFilter) criteria.status = statusFilter;

    if (search) {
      criteria.$or = [{ creditNoteNo: { $regex: search, $options: "si" } }, { notes: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
      populate: [
        {
          path: "customerId",
          select: "firstName lastName companyName phoneNo ",
        },
        {
          path: "returnPosOrderId",
          select: "returnOrderNo posOrderId items total",
          populate: [
            { path: "items.productId", select: "hsnCode name" },
            { path: "posOrderId", select: "orderNo" },
          ],
        },
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "usedOnOrderIds", select: "orderNo" },
        { path: "createdBy", select: "fullName userType" },
      ],
    };

    const response = await getDataWithSorting(posCreditNoteModel, criteria, {}, options);
    const totalData = await countData(posCreditNoteModel, criteria);

    const result = {
      posCreditNote_data: response,
      totalData,
      state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 },
    };
    await redisSet(cacheKey, result, 3600);

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("POS Credit Note"),
        result,
        {},
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getOnePosCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPosCreditNoteSchema.validate(req.params);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `posCreditNote:one:req:${JSON.stringify(req.params)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note"), cachedData, {}));

    const response = await getFirstMatch(
      posCreditNoteModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          {
            path: "customerId",
            select: "firstName lastName companyName email phoneNo address.city address.state",
          },

          {
            path: "returnPosOrderId",
            select: "returnOrderNo items total posOrderId",
            populate: [
              { path: "items.productId", select: "hsnCode name" },
              { path: "posOrderId", select: "orderNo" },
            ],
          },
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "usedOnOrderIds", select: "orderNo" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    const productIds = response?.returnPosOrderId?.items?.map((item) => item?.productId?._id);
    const stockResponse = await getDataWithSorting(
      stockModel,
      {
        isDeleted: false,
        isActive: true,
        companyId: response?.companyId,
        productId: { $in: productIds },
      },
      {
        productId: 1,
        uomId: 1,
        sellingDiscount: 1,
        purchaseTaxId: 1,
        salesTaxId: 1,
        isPurchaseTaxIncluding: 1,
        isSalesTaxIncluding: 1,
      },
      {
        sort: { updatedAt: -1 },
        populate: [
          { path: "purchaseTaxId", select: "name percentage" },
          { path: "salesTaxId", select: "name percentage" },
          { path: "uomId", select: "name code" },
        ],
      },
    );

    const stockMap = stockResponse.reduce((acc, stock) => {
      acc[stock.productId.toString()] = stock;
      return acc;
    }, {});

    const updatedResponse = {
      ...response,
      returnPosOrderId: {
        ...response?.returnPosOrderId,
        items: response?.returnPosOrderId?.items?.map((item) => {
          const product = item?.productId;
          if (product && product._id) {
            const stock = stockMap[product._id.toString()];
            item.productId = {
              ...product,
              sellingDiscount: stock?.sellingDiscount ?? product.sellingDiscount,
              purchaseTaxId: stock?.purchaseTaxId,
              salesTaxId: stock?.salesTaxId,
              isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding,
              isSalesTaxIncluding: stock?.isSalesTaxIncluding,
              uomId: stock?.uomId,
            };
          }
          return item;
        }),
      },
    };

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Credit Note"), {}, {}));
    }

    const result = { response, updatedResponse };
    await redisSet(cacheKey, result, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note"), result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const deletePosCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deletePosCreditNoteSchema.validate(req.params);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(posCreditNoteModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Credit Note"), {}, {}));
    }

    const response = await updateData(posCreditNoteModel, { _id: value?.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    if (!response) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.deleteDataError("POS Credit Note"), {}, {}));
    }

    await redisdelPattern("posCreditNote:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("POS Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getCreditNoteRedeemDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `posCreditNote:redeemDropdown:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note"), cachedData, {}));

    const { customerFilter, typeFilter, companyFilter, branchFilter, includeId } = req.query;

    let filterCompanyId = companyFilter || companyId;
    let filterBranchId = branchFilter || branchId;
    let response: any[] = [];

    if (typeFilter === REDEEM_CREDIT_TYPE.CREDIT_NOTE) {
      let criteria: any = { isDeleted: false, creditsRemaining: { $gt: 0 }, status: POS_CREDIT_NOTE_STATUS.AVAILABLE };
      if (filterCompanyId) criteria.companyId = new ObjectId(filterCompanyId as string);
      if (filterBranchId) criteria.branchId = new ObjectId(filterBranchId as string);
      if (customerFilter) criteria.customerId = new ObjectId(customerFilter as string);

      criteria = handleIncludeId(criteria, includeId);

      const data = await posCreditNoteModel.find(criteria).select("creditNoteNo customerId branchId").populate({ path: "branchId", select: "name" }).sort({ createdAt: -1 });

      response = data.map((item) => ({
        id: item._id,
        no: item.creditNoteNo,
        customerId: item.customerId,
        branchId: item.branchId,
      }));
    } else if (typeFilter === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT) {
      let criteria: any = {
        isDeleted: false,
        paymentType: POS_PAYMENT_TYPE.ADVANCE,
        amount: { $gt: 0 },
      };
      if (filterCompanyId) criteria.companyId = new ObjectId(filterCompanyId as string);
      if (filterBranchId) criteria.branchId = new ObjectId(filterBranchId as string);
      if (customerFilter) criteria.partyId = new ObjectId(customerFilter as string);

      criteria = handleIncludeId(criteria, includeId);

      const data = await PosPaymentModel.find(criteria).select("paymentNo partyId branchId").populate({ path: "branchId", select: "name" }).sort({ createdAt: -1 });

      response = data.map((item) => ({
        id: item._id,
        no: item.paymentNo,
        customerId: item.partyId,
        branchId: item.branchId,
      }));
    }

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getPosCreditNoteDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `posCreditNote:dropdown:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note Dropdown"), cachedData, {}));

    const { customerFilter, typeFilter, companyFilter, branchFilter, includeId } = req.query;

    let filterCompanyId = companyFilter || user?.companyId?._id;
    let filterBranchId = branchFilter || user?.branchId?._id;
    let response: any[] = [];

    if (typeFilter === REDEEM_CREDIT_TYPE.CREDIT_NOTE) {
      let criteria: any = { isDeleted: false, creditsRemaining: { $gt: 0 }, status: POS_CREDIT_NOTE_STATUS.AVAILABLE };
      if (filterCompanyId) criteria.companyId = new ObjectId(filterCompanyId as string);
      if (filterBranchId) criteria.branchId = new ObjectId(filterBranchId as string);
      if (customerFilter) criteria.customerId = new ObjectId(customerFilter as string);

      criteria = handleIncludeId(criteria, includeId);

      const data = await posCreditNoteModel.find(criteria).select("creditNoteNo customerId branchId creditsRemaining totalAmount").populate({ path: "branchId", select: "name" }).sort({ createdAt: -1 });

      response = data.map((item) => ({
        _id: item._id,
        name: `${item.creditNoteNo} (${item.creditsRemaining})`,
        creditNoteNo: item.creditNoteNo,
        creditsRemaining: item.creditsRemaining,
        amount: item.totalAmount,
        customerId: item.customerId,
        branchId: item.branchId,
      }));
    } else if (typeFilter === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT) {
      let criteria: any = {
        isDeleted: false,
        paymentType: POS_PAYMENT_TYPE.ADVANCE,
        amount: { $gt: 0 },
      };
      if (companyId) criteria.companyId = new ObjectId(companyId as string);
      if (branchId) criteria.branchId = new ObjectId(branchId as string);
      if (customerFilter) criteria.partyId = new ObjectId(customerFilter as string);

      criteria = handleIncludeId(criteria, includeId);

      const data = await PosPaymentModel.find(criteria).select("paymentNo partyId branchId amount totalAmount").populate({ path: "branchId", select: "name" }).sort({ createdAt: -1 });

      response = data.map((item) => ({
        _id: item._id,
        name: `${item.paymentNo} (${item.amount})`,
        paymentNo: item.paymentNo,
        creditsRemaining: item.amount,
        amount: item.totalAmount,
        customerId: item.partyId,
        branchId: item.branchId,
      }));
    }

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Credit Note Dropdown"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};



