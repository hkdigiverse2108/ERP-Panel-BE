import { POS_CREDIT_NOTE_STATUS } from './../../common/enum';
import { PosPaymentModel, PosOrderModel, contactModel, PosCashRegisterModel, taxModel, supplierBillModel, posCreditNoteModel } from "../../database";
import { apiResponse, HTTP_STATUS, PAY_LATER_STATUS, POS_ORDER_STATUS, POS_PAYMENT_STATUS, POS_PAYMENT_TYPE, POS_VOUCHER_TYPE, CASH_REGISTER_STATUS, PREFIX_MODULES } from "../../common";
import { checkBranch, checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, updateData, responseMessage, applyDateFilter, getAndIncrementPrefix } from "../../helper";
import { addPosPaymentSchema, editPosPaymentSchema, getPosPaymentSchema, deletePosPaymentSchema } from "../../validation";

export const addPosPayment = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = addPosPaymentSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));

    if (value.posOrderId && !(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
    if (value.partyId && !(await checkIdExist(contactModel, value.partyId, "Party", res))) return;

    // --- Link Open Cash Register ---
    const openRegister = await getFirstMatch(
      PosCashRegisterModel,
      {
        branchId: value.branchId,
        status: CASH_REGISTER_STATUS.OPEN,
        isDeleted: false,
      },
      {},
      {},
    );

    if (openRegister) {
      value.posCashRegisterId = openRegister._id;
    }
    // -------------------------------

    value.paymentNo = await getAndIncrementPrefix({
      branchId: value.branchId,
      companyId: value.companyId,
      prefixType: PREFIX_MODULES.POS_PAYMENT,
      model: PosPaymentModel,
      fieldName: "paymentNo",
    });

    if (value.posCreditNoteId) {
      if (!(await checkIdExist(posCreditNoteModel, value.posCreditNoteId, "POS Credit Note", res))) return;
    }

    if (value.voucherType === POS_VOUCHER_TYPE.SALES && value.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      const posOrder = await getFirstMatch(PosOrderModel, { _id: value.posOrderId, isDeleted: false }, {}, {});
      if (!posOrder) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
      }

      posOrder.multiplePayments.push({
        amount: value.amount,
        method: value.paymentMode,
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

    if (value.voucherType === POS_VOUCHER_TYPE.PURCHASE && value.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      if (value.purchaseBillId) {
        const supplierBill = await getFirstMatch(supplierBillModel, { _id: value.purchaseBillId, isDeleted: false }, {}, {});
        if (!supplierBill) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Supplier Bill"), {}, {}));
        }

        supplierBill.paidAmount = (supplierBill.paidAmount || 0) + value.amount;
        supplierBill.balanceAmount = (supplierBill.totalAmount || 0) - supplierBill.paidAmount;

        if (supplierBill.balanceAmount <= 0) {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.PAID;
          supplierBill.balanceAmount = 0;
        } else if (supplierBill.paidAmount > 0) {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
        } else {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
        }
        await updateData(supplierBillModel, { _id: value.purchaseBillId }, supplierBill, {});
      }

      if (value.posCreditNoteId) {
        const posCreditNote = await getFirstMatch(posCreditNoteModel, { _id: value.posCreditNoteId, isDeleted: false }, {}, {});
        if (!posCreditNote) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Credit Note"), {}, {}));
        }

        posCreditNote.refundedAmount = (posCreditNote.refundedAmount || 0) + value.amount;
        posCreditNote.creditsRemaining = (posCreditNote.totalAmount || 0) - (posCreditNote.creditsUsed || 0) - posCreditNote.refundedAmount;

        if (posCreditNote.creditsRemaining <= 0) {
          posCreditNote.status = POS_CREDIT_NOTE_STATUS.USED;
          posCreditNote.creditsRemaining = 0;
        } else {
          posCreditNote.status = POS_CREDIT_NOTE_STATUS.AVAILABLE;
        }
        await updateData(posCreditNoteModel, { _id: value.posCreditNoteId }, posCreditNote, {});
      }
    }

    if (value.taxId) {
      const tax = await getFirstMatch(taxModel, { _id: value.taxId, isDeleted: false }, {}, {});
      if (!tax) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Tax"), {}, {}));
      }
      value.taxId = tax._id;
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

    if (value.purchaseBillId && value.purchaseBillId !== isExist.purchaseBillId?.toString()) {
      if (!(await checkIdExist(supplierBillModel, value.purchaseBillId, "Supplier Bill", res))) return;
    }

    if (value.posCreditNoteId && value.posCreditNoteId !== isExist.posCreditNoteId?.toString()) {
      if (!(await checkIdExist(posCreditNoteModel, value.posCreditNoteId, "POS Credit Note", res))) return;
    }

    if (value.partyId && value.partyId !== isExist.partyId?.toString()) {
      if (!(await checkIdExist(contactModel, value.partyId, "Party", res))) return;
    }

    if (value.voucherType === POS_VOUCHER_TYPE.SALES && value.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      const posOrder = await getFirstMatch(PosOrderModel, { _id: value.posOrderId, isDeleted: false }, {}, {});
      if (!posOrder) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));
      }

      posOrder.multiplePayments.push({
        amount: value.amount,
        method: value.paymentMode,
      });

      posOrder.paidAmount = (posOrder.paidAmount || 0) - (isExist.amount || 0) + value.amount;
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

    if (value.voucherType === POS_VOUCHER_TYPE.PURCHASE && value.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      if (value.purchaseBillId) {
        const supplierBill = await getFirstMatch(supplierBillModel, { _id: value.purchaseBillId, isDeleted: false }, {}, {});
        if (!supplierBill) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Supplier Bill"), {}, {}));
        }

        supplierBill.paidAmount = (supplierBill.paidAmount || 0) - (isExist.amount || 0) + (value.amount || 0);
        supplierBill.balanceAmount = (supplierBill.totalAmount || 0) - supplierBill.paidAmount;

        if (supplierBill.balanceAmount <= 0) {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.PAID;
          supplierBill.balanceAmount = 0;
        } else if (supplierBill.paidAmount > 0) {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
        } else {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
        }
        await updateData(supplierBillModel, { _id: value.purchaseBillId }, supplierBill, {});
      }

      if (value.posCreditNoteId) {
        const posCreditNote = await getFirstMatch(posCreditNoteModel, { _id: value.posCreditNoteId, isDeleted: false }, {}, {});
        if (!posCreditNote) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Credit Note"), {}, {}));
        }

        posCreditNote.refundedAmount = (posCreditNote.refundedAmount || 0) - (isExist.amount || 0) + (value.amount || 0);
        posCreditNote.creditsRemaining = (posCreditNote.totalAmount || 0) - (posCreditNote.creditsUsed || 0) - posCreditNote.refundedAmount;

        if (posCreditNote.creditsRemaining <= 0) {
          posCreditNote.status = POS_CREDIT_NOTE_STATUS.USED;
          posCreditNote.creditsRemaining = 0;
        } else {
          posCreditNote.status = POS_CREDIT_NOTE_STATUS.AVAILABLE;
        }
        await updateData(posCreditNoteModel, { _id: value.posCreditNoteId }, posCreditNote, {});
      }
    }

    if (value.taxId) {
      const tax = await getFirstMatch(taxModel, { _id: value.taxId, isDeleted: false }, {}, {});
      if (!tax) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Tax"), {}, {}));
      }
      value.taxId = tax._id;
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
    const branchId = user?.branchId?._id;
    let { page, limit, search, posOrderFilter, voucherTypeFilter, paymentTypeFilter, startDate, endDate, companyFilter, branchFilter, partyFilter, activeFilter, date } = req.query;
    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) criteria.companyId = companyId;
    if (companyFilter) criteria.companyId = companyFilter;
    if (branchId) criteria.branchId = branchId;
    if (branchFilter) criteria.branchId = branchFilter;
    if (posOrderFilter) criteria.posOrderId = posOrderFilter;
    if (voucherTypeFilter) criteria.voucherType = voucherTypeFilter;
    if (paymentTypeFilter) criteria.paymentType = paymentTypeFilter;
    if (partyFilter) criteria.partyId = partyFilter;
    if (activeFilter) criteria.isActive = activeFilter === "true" ? true : false;
    if (date) criteria.date = date;

    if (search) {
      criteria.paymentNo = { $regex: search, $options: "si" };
    }

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "posOrderId", select: "orderNo totalAmount createdAt paidAmount" },
        { path: "partyId", select: "firstName lastName companyName" },
        { path: "purchaseBillId", select: "supplierBillNo totalAmount" },
        { path: "posCreditNoteId", select: "creditNoteNo totalAmount" },
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "taxId", select: "name percentage" },
        { path: "createdBy", select: "fullName userType" },
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
          { path: "purchaseBillId", select: "supplierBillNo totalAmount" },
          { path: "posCreditNoteId", select: "creditNoteNo totalAmount" },
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "taxId", select: "name percentage" },
          { path: "createdBy", select: "fullName userType" },
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

    if (isExist.voucherType === POS_VOUCHER_TYPE.SALES && isExist.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL && isExist.posOrderId) {
      const posOrder = await getFirstMatch(PosOrderModel, { _id: isExist.posOrderId, isDeleted: false }, {}, {});
      if (posOrder) {
        posOrder.paidAmount = (posOrder.paidAmount || 0) - (isExist.amount || 0);
        if (posOrder.paidAmount >= posOrder.totalAmount) {
          posOrder.paymentStatus = POS_PAYMENT_STATUS.PAID;
          posOrder.status = POS_ORDER_STATUS.COMPLETED;
          posOrder.payLater.status = PAY_LATER_STATUS.SETTLED;
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
        await updateData(PosOrderModel, { _id: isExist.posOrderId }, posOrder, {});
      }
    }

    if (isExist.voucherType === POS_VOUCHER_TYPE.PURCHASE && isExist.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL && isExist.purchaseBillId) {
      const supplierBill = await getFirstMatch(supplierBillModel, { _id: isExist.purchaseBillId, isDeleted: false }, {}, {});
      if (supplierBill) {
        supplierBill.paidAmount = (supplierBill.paidAmount || 0) - (isExist.amount || 0);
        supplierBill.balanceAmount = (supplierBill.totalAmount || 0) - supplierBill.paidAmount;

        if (supplierBill.balanceAmount <= 0) {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.PAID;
          supplierBill.balanceAmount = 0;
        } else if (supplierBill.paidAmount > 0) {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.PARTIAL;
        } else {
          supplierBill.paymentStatus = POS_PAYMENT_STATUS.UNPAID;
        }
        await updateData(supplierBillModel, { _id: isExist.purchaseBillId }, supplierBill, {});
      }
    }

    if (isExist.voucherType === POS_VOUCHER_TYPE.PURCHASE && isExist.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL && isExist.posCreditNoteId) {
      const posCreditNote = await getFirstMatch(posCreditNoteModel, { _id: isExist.posCreditNoteId, isDeleted: false }, {}, {});
      if (posCreditNote) {
        posCreditNote.refundedAmount = (posCreditNote.refundedAmount || 0) - (isExist.amount || 0);
        posCreditNote.creditsRemaining = (posCreditNote.totalAmount || 0) - (posCreditNote.creditsUsed || 0) - posCreditNote.refundedAmount;

        if (posCreditNote.creditsRemaining <= 0) {
          posCreditNote.status = POS_CREDIT_NOTE_STATUS.USED;
          posCreditNote.creditsRemaining = 0;
        } else {
          posCreditNote.status = POS_CREDIT_NOTE_STATUS.AVAILABLE;
        }
        await updateData(posCreditNoteModel, { _id: isExist.posCreditNoteId }, posCreditNote, {});
      }
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
