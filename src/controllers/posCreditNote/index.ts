import {
  posCreditNoteModel,
  PosPaymentModel,
  stockModel,
} from "../../database";
import {
  apiResponse,
  HTTP_STATUS,
  REDEEM_CREDIT_TYPE,
  POS_PAYMENT_TYPE,
} from "../../common";
import {
  countData,
  getDataWithSorting,
  getFirstMatch,
  reqInfo,
  responseMessage,
  updateData,
  applyDateFilter,
  checkIdExist,
} from "../../helper";
import {
  getPosCreditNoteSchema,
  deletePosCreditNoteSchema,
  checkRedeemCreditSchema,
  refundPosCreditSchema,
  getCreditNoteDropdownSchema,
} from "../../validation";
import {
  returnPosOrderModel,
  PosCashRegisterModel,
  bankModel,
} from "../../database";
import { CASH_REGISTER_STATUS, POS_CREDIT_NOTE_STATUS } from "../../common";

const ObjectId = require("mongoose").Types.ObjectId;

export const checkRedeemCredit = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = checkRedeemCreditSchema.validate(req.body);
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

    const { code, type, customerId } = value;
    let redeemableAmount = 0;
    let data: any = null;

    if (type === REDEEM_CREDIT_TYPE.CREDIT_NOTE) {
      data = await getFirstMatch(
        posCreditNoteModel,
        { creditNoteNo: code, isDeleted: false },
        {},
        {},
      );
      if (!data) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(
            new apiResponse(
              HTTP_STATUS.NOT_FOUND,
              "Credit Note not found",
              {},
              {},
            ),
          );
      }
      if (customerId && data.customerId?.toString() !== customerId) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            new apiResponse(
              HTTP_STATUS.BAD_REQUEST,
              "Credit Note does not belong to this customer",
              {},
              {},
            ),
          );
      }
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
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(
            new apiResponse(
              HTTP_STATUS.NOT_FOUND,
              "Advance Payment not found",
              {},
              {},
            ),
          );
      }
      if (customerId && data.partyId?.toString() !== customerId) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            new apiResponse(
              HTTP_STATUS.BAD_REQUEST,
              "Advance Payment does not belong to this customer",
              {},
              {},
            ),
          );
      }
      redeemableAmount = data.amount || 0;
    }

    if (redeemableAmount <= 0) {
      return res
        .status(HTTP_STATUS.OK)
        .json(
          new apiResponse(
            HTTP_STATUS.OK,
            "No redeemable credit available",
            { redeemableAmount: 0 },
            {},
          ),
        );
    }

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        "Redeem credit verified successfully",
        {
          id: data._id,
          code: code,
          type: type,
          redeemableAmount: redeemableAmount,
          date: data.createdAt,
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
          responseMessage?.internalServerError,
          {},
          error,
        ),
      );
  }
};

export const refundPosCredit = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = refundPosCreditSchema.validate(req.body);
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

    const {
      posCreditNoteId,
      refundViaCash,
      refundViaBank,
      bankAccountId,
      refundDescription,
    } = value;
    const totalRefund = (refundViaCash || 0) + (refundViaBank || 0);

    if (totalRefund <= 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            "Refund amount must be greater than zero",
            {},
            {},
          ),
        );
    }

    const creditNote = await getFirstMatch(
      posCreditNoteModel,
      { _id: posCreditNoteId, isDeleted: false },
      {},
      {},
    );
    if (!creditNote) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage.getDataNotFound("Credit Note"),
            {},
            {},
          ),
        );
    }

    if (creditNote.creditsRemaining !== totalRefund) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            `Credit Note amount and refund amount must be equal`,
            {},
            {},
          ),
        );
    }

    if (creditNote.creditsRemaining < totalRefund) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            `Insufficient credits. Available: ${creditNote.creditsRemaining}`,
            {},
            {},
          ),
        );
    }

    if (refundViaBank > 0 && !bankAccountId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          new apiResponse(
            HTTP_STATUS.BAD_REQUEST,
            "Bank Account Id is required for bank refund",
            {},
            {},
          ),
        );
    }

    if (
      bankAccountId &&
      !(await checkIdExist(bankModel, bankAccountId, "Bank Account", res))
    )
      return;

    // Update Credit Note
    const updatedCreditNote = await posCreditNoteModel.findOneAndUpdate(
      { _id: posCreditNoteId },
      {
        $inc: { creditsUsed: totalRefund, creditsRemaining: -totalRefund },
        $set: { updatedBy: user?._id || null },
      },
      { new: true },
    );

    if (updatedCreditNote && updatedCreditNote.creditsRemaining <= 0) {
      await posCreditNoteModel.updateOne(
        { _id: posCreditNoteId },
        { status: POS_CREDIT_NOTE_STATUS.USED },
      );
    }

    // Update Return POS Order
    if (creditNote.returnPosOrderId) {
      const returnUpdate: any = {
        $inc: {
          refundViaCash: refundViaCash || 0,
          refundViaBank: refundViaBank || 0,
        },
        $set: { updatedBy: user?._id || null },
      };
      if (bankAccountId) returnUpdate.$set.bankAccountId = bankAccountId;
      if (refundDescription)
        returnUpdate.$set.refundDescription = refundDescription;

      await returnPosOrderModel.findOneAndUpdate(
        { _id: creditNote.returnPosOrderId },
        returnUpdate,
        { new: true },
      );
    }

    // Update Cash Register
    const cashRegister = await getFirstMatch(
      PosCashRegisterModel,
      {
        createdBy: user?._id,
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

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          "Credit Note refunded successfully",
          updatedCreditNote,
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

export const getAllPosCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let {
      page,
      limit,
      search,
      customerFilter,
      startDate,
      endDate,
      companyFilter,
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) criteria.companyId = companyId;
    if (customerFilter) criteria.customerId = new ObjectId(customerFilter);
    if (companyFilter) criteria.companyId = new ObjectId(companyFilter);

    if (search) {
      criteria.$or = [
        { creditNoteNo: { $regex: search, $options: "si" } },
        { notes: { $regex: search, $options: "si" } },
      ];
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
          select: "returnOrderNo items total",
          populate: { path: "items.productId", select: "hsnCode name" },
        },
        { path: "companyId", select: "name" },
      ],
    };

    const response = await getDataWithSorting(
      posCreditNoteModel,
      criteria,
      {},
      options,
    );
    const totalData = await countData(posCreditNoteModel, criteria);

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("POS Credit Note"),
        {
          posCreditNote_data: response,
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

export const getOnePosCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPosCreditNoteSchema.validate(req.params);
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
      posCreditNoteModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          {
            path: "customerId",
            select:
              "firstName lastName companyName email phoneNo address.city address.state",
          },

          {
            path: "returnPosOrderId",
            select: "returnOrderNo items total",
            populate: { path: "items.productId", select: "hsnCode name" },
          },
          { path: "companyId", select: "name" },
        ],
      },
    );

    const productIds = response?.returnPosOrderId?.items?.map(
      (item) => item?.productId?._id,
    );
    console.log("productIds", productIds);
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
    console.log("response -", response);

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
              sellingDiscount:
                stock?.sellingDiscount ?? product.sellingDiscount,
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

    console.log("updatedResponse", updatedResponse);

    if (!response) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new apiResponse(
            HTTP_STATUS.NOT_FOUND,
            responseMessage?.getDataNotFound("POS Credit Note"),
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
          responseMessage?.getDataSuccess("POS Credit Note"),
          { response, updatedResponse },
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

export const deletePosCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deletePosCreditNoteSchema.validate(req.params);
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
      posCreditNoteModel,
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
            responseMessage?.getDataNotFound("POS Credit Note"),
            {},
            {},
          ),
        );
    }

    const response = await updateData(
      posCreditNoteModel,
      { _id: value?.id },
      { isDeleted: true, updatedBy: user?._id || null },
      {},
    );

    if (!response) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(
          new apiResponse(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            responseMessage?.deleteDataError("POS Credit Note"),
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
          responseMessage?.deleteDataSuccess("POS Credit Note"),
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

export const getCreditNoteRedeemDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = getCreditNoteDropdownSchema.validate(req.query);
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

    const { customerFilter, typeFilter, companyFilter } = value;

    let companyId = companyFilter || user?.companyId?._id;
    let response: any[] = [];

    if (
      typeFilter === REDEEM_CREDIT_TYPE.CREDIT_NOTE ||
      typeFilter === REDEEM_CREDIT_TYPE.CREDIT_NOTE
    ) {
      let criteria: any = { isDeleted: false, creditsRemaining: { $gt: 0 } };
      if (companyId) criteria.companyId = new ObjectId(companyId);
      if (customerFilter) criteria.customerId = new ObjectId(customerFilter);

      const data = await posCreditNoteModel
        .find(criteria)
        .select("creditNoteNo customerId")
        .sort({ createdAt: -1 });

      response = data.map((item) => ({
        id: item._id,
        no: item.creditNoteNo,
        customerId: item.customerId,
      }));
    } else if (
      typeFilter === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT ||
      typeFilter === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT
    ) {
      let criteria: any = {
        isDeleted: false,
        paymentType: POS_PAYMENT_TYPE.ADVANCE,
      };
      if (companyId) criteria.companyId = new ObjectId(companyId);
      if (customerFilter) criteria.partyId = new ObjectId(customerFilter);

      const data = await PosPaymentModel.find(criteria)
        .select("paymentNo partyId")
        .sort({ createdAt: -1 });

      response = data.map((item) => ({
        id: item._id,
        no: item.paymentNo,
        customerId: item.partyId,
      }));
    }

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.getDataSuccess("POS Credit Note"),
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
