import { POS_CREDIT_NOTE_STATUS, SUPPLIER_PAYMENT_STATUS, PURCHASE_DEBIT_NOTE_STATUS, INVOICE_PAYMENT_STATUS } from './../../common/enum';
import { PosPaymentModel, PosOrderModel, contactModel, PosCashRegisterModel, taxModel, supplierBillModel, posCreditNoteModel, InvoiceModel, salesCreditNoteModel } from "../../database";
import { apiResponse, HTTP_STATUS, PAY_LATER_STATUS, POS_ORDER_STATUS, POS_PAYMENT_STATUS, POS_PAYMENT_TYPE, POS_VOUCHER_TYPE, CASH_REGISTER_STATUS, PREFIX_MODULES } from "../../common";
import { checkBranch, checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, updateData, responseMessage, applyDateFilter, getAndIncrementPrefix, handleIncludeId } from "../../helper";
import { addPosPaymentSchema, editPosPaymentSchema, getPosPaymentSchema, deletePosPaymentSchema, pendingPaymentDropDownSchema, pendingCreditDropDownSchema } from "../../validation";
import { redisGet, redisSet, redisdelPattern } from "../../helper";

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
    if (value.invoiceId && !(await checkIdExist(InvoiceModel, value.invoiceId, "Invoice", res))) return;
    if (value.salesCreditNoteId && !(await checkIdExist(salesCreditNoteModel, value.salesCreditNoteId, "Sales Credit Note", res))) return;
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
      if (value.posOrderId) {
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

      if (value.invoiceId) {
        const invoice = await getFirstMatch(InvoiceModel, { _id: value.invoiceId, isDeleted: false }, {}, {});
        if (!invoice) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Invoice"), {}, {}));
        }

        invoice.paidAmount = (invoice.paidAmount || 0) + value.amount;
        const totalAmount = invoice.transactionSummary?.netAmount || 0;
        invoice.balanceAmount = Math.max(0, totalAmount - invoice.paidAmount);

        if (invoice.balanceAmount <= 0) {
          invoice.paymentStatus = INVOICE_PAYMENT_STATUS.PAID;
          invoice.balanceAmount = 0;
        } else if (invoice.paidAmount > 0) {
          invoice.paymentStatus = INVOICE_PAYMENT_STATUS.PARTIAL;
        } else {
          invoice.paymentStatus = INVOICE_PAYMENT_STATUS.UNPAID;
        }
        await updateData(InvoiceModel, { _id: value.invoiceId }, invoice, {});
      }
    }

    if (value.voucherType === POS_VOUCHER_TYPE.PURCHASE && value.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      if (value.purchaseBillId) {
        const supplierBill = await getFirstMatch(supplierBillModel, { _id: value.purchaseBillId, isDeleted: false }, {}, {});
        if (!supplierBill) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Supplier Bill"), {}, {}));
        }

        const totalBillAmount = supplierBill.summary?.netAmount || supplierBill.totalAmount || 0;
        supplierBill.paidAmount = (supplierBill.paidAmount || 0) + value.amount;
        supplierBill.balanceAmount = totalBillAmount - supplierBill.paidAmount;

        if (supplierBill.balanceAmount <= 0) {
          supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.PAID;
          supplierBill.balanceAmount = 0;
        } else if (supplierBill.paidAmount > 0) {
          supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.PARTIAL;
        } else {
          supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.UNPAID;
        }
        await updateData(supplierBillModel, { _id: value.purchaseBillId }, supplierBill, {});
      }

      if (value.posCreditNoteId) {
        const posCreditNote = await getFirstMatch(posCreditNoteModel, { _id: value.posCreditNoteId, isDeleted: false }, {}, {});
        if (!posCreditNote) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Credit Note"), {}, {}));
        }

        posCreditNote.refundedAmount = (posCreditNote.refundedAmount || 0) + (value.amount || 0);
        posCreditNote.creditsRemaining = (posCreditNote.totalAmount || 0) - (posCreditNote.creditsUsed || 0) - posCreditNote.refundedAmount;

        if (posCreditNote.creditsRemaining <= 0) {
          posCreditNote.status = POS_CREDIT_NOTE_STATUS.USED;
          posCreditNote.creditsRemaining = 0;
        } else {
          posCreditNote.status = POS_CREDIT_NOTE_STATUS.AVAILABLE;
        }
        await updateData(posCreditNoteModel, { _id: value.posCreditNoteId }, posCreditNote, {});
      }

      if (value.salesCreditNoteId) {
        const salesCreditNote = await getFirstMatch(salesCreditNoteModel, { _id: value.salesCreditNoteId, isDeleted: false }, {}, {});
        if (!salesCreditNote) {
          return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Sales Credit Note"), {}, {}));
        }

        salesCreditNote.paidAmount = (salesCreditNote.paidAmount || 0) + value.amount;
        const totalAmount = salesCreditNote.summary?.netAmount || 0;
        salesCreditNote.balanceAmount = Math.max(0, totalAmount - salesCreditNote.paidAmount);

        if (salesCreditNote.balanceAmount <= 0) {
          salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.PAID;
          salesCreditNote.balanceAmount = 0;
        } else if (salesCreditNote.paidAmount > 0) {
          salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.DUE;
        } else {
          salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.OPEN;
        }
        await updateData(salesCreditNoteModel, { _id: value.salesCreditNoteId }, salesCreditNote, {});
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

    await redisdelPattern("posPayment:*");
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

    if (value.invoiceId && value.invoiceId !== isExist.invoiceId?.toString()) {
      if (!(await checkIdExist(InvoiceModel, value.invoiceId, "Invoice", res))) return;
    }

    if (value.salesCreditNoteId && value.salesCreditNoteId !== isExist.salesCreditNoteId?.toString()) {
      if (!(await checkIdExist(salesCreditNoteModel, value.salesCreditNoteId, "Sales Credit Note", res))) return;
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

    const voucherType = value.voucherType || isExist.voucherType;
    const paymentType = value.paymentType || isExist.paymentType;
    const amount = value.amount !== undefined ? value.amount : isExist.amount;

    if (voucherType === POS_VOUCHER_TYPE.SALES && paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      const posOrderId = value.posOrderId || isExist.posOrderId;
      if (posOrderId) {
        const posOrder = await getFirstMatch(PosOrderModel, { _id: posOrderId, isDeleted: false }, {}, {});
        if (posOrder) {
          posOrder.paidAmount = (posOrder.paidAmount || 0) - (isExist.amount || 0) + amount;

          if (posOrder.paidAmount >= posOrder.totalAmount) {
            posOrder.paymentStatus = POS_PAYMENT_STATUS.PAID;
            posOrder.status = POS_ORDER_STATUS.COMPLETED;
            posOrder.payLater.status = PAY_LATER_STATUS.SETTLED;
            posOrder.payLater.settledDate = new Date();
            posOrder.payLater.sendReminder = false;
            posOrder.dueAmount = 0;
          } else if (posOrder.paidAmount > 0) {
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
          await updateData(PosOrderModel, { _id: posOrderId }, posOrder, {});
        }
      }

      const invoiceId = value.invoiceId || isExist.invoiceId;
      if (invoiceId) {
        const invoice = await getFirstMatch(InvoiceModel, { _id: invoiceId, isDeleted: false }, {}, {});
        if (invoice) {
          invoice.paidAmount = (invoice.paidAmount || 0) - (isExist.amount || 0) + amount;
          const totalAmount = invoice.transactionSummary?.netAmount || 0;
          invoice.balanceAmount = Math.max(0, totalAmount - invoice.paidAmount);

          if (invoice.balanceAmount <= 0) {
            invoice.paymentStatus = INVOICE_PAYMENT_STATUS.PAID;
            invoice.balanceAmount = 0;
          } else if (invoice.paidAmount > 0) {
            invoice.paymentStatus = INVOICE_PAYMENT_STATUS.PARTIAL;
          } else {
            invoice.paymentStatus = INVOICE_PAYMENT_STATUS.UNPAID;
          }
          await updateData(InvoiceModel, { _id: invoiceId }, invoice, {});
        }
      }
    }

    if (voucherType === POS_VOUCHER_TYPE.PURCHASE && paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      const purchaseBillId = value.purchaseBillId || isExist.purchaseBillId;
      if (purchaseBillId) {
        const supplierBill = await getFirstMatch(supplierBillModel, { _id: purchaseBillId, isDeleted: false }, {}, {});
        if (supplierBill) {
          const totalBillAmount = supplierBill.summary?.netAmount || supplierBill.totalAmount || 0;
          supplierBill.paidAmount = (supplierBill.paidAmount || 0) - (isExist.amount || 0) + amount;
          supplierBill.balanceAmount = Math.max(0, totalBillAmount - supplierBill.paidAmount);

          if (supplierBill.balanceAmount <= 0) {
            supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.PAID;
            supplierBill.balanceAmount = 0;
          } else if (supplierBill.paidAmount > 0) {
            supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.PARTIAL;
          } else {
            supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.UNPAID;
          }
          await updateData(supplierBillModel, { _id: purchaseBillId }, supplierBill, {});
        }
      }

      const posCreditNoteId = value.posCreditNoteId || isExist.posCreditNoteId;
      if (posCreditNoteId) {
        const posCreditNote = await getFirstMatch(posCreditNoteModel, { _id: posCreditNoteId, isDeleted: false }, {}, {});
        if (posCreditNote) {
          posCreditNote.refundedAmount = (posCreditNote.refundedAmount || 0) - (isExist.amount || 0) + amount;
          posCreditNote.creditsRemaining = (posCreditNote.totalAmount || 0) - (posCreditNote.creditsUsed || 0) - posCreditNote.refundedAmount;

          if (posCreditNote.creditsRemaining <= 0) {
            posCreditNote.status = POS_CREDIT_NOTE_STATUS.USED;
            posCreditNote.creditsRemaining = 0;
          } else {
            posCreditNote.status = POS_CREDIT_NOTE_STATUS.AVAILABLE;
          }
          await updateData(posCreditNoteModel, { _id: posCreditNoteId }, posCreditNote, {});
        }
      }

      const salesCreditNoteId = value.salesCreditNoteId || isExist.salesCreditNoteId;
      if (salesCreditNoteId) {
        const salesCreditNote = await getFirstMatch(salesCreditNoteModel, { _id: salesCreditNoteId, isDeleted: false }, {}, {});
        if (salesCreditNote) {
          salesCreditNote.paidAmount = (salesCreditNote.paidAmount || 0) - (isExist.amount || 0) + amount;
          const totalAmount = salesCreditNote.summary?.netAmount || 0;
          salesCreditNote.balanceAmount = Math.max(0, totalAmount - salesCreditNote.paidAmount);

          if (salesCreditNote.balanceAmount <= 0) {
            salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.PAID;
            salesCreditNote.balanceAmount = 0;
          } else if (salesCreditNote.paidAmount > 0) {
            salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.DUE;
          } else {
            salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.OPEN;
          }
          await updateData(salesCreditNoteModel, { _id: salesCreditNoteId }, salesCreditNote, {});
        }
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

    await redisdelPattern("posPayment:*");
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
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `posPayment:all:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Payment"), cachedData, {}));

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
        { path: "invoiceId", select: "invoiceNo transactionSummary" },
        { path: "salesCreditNoteId", select: "creditNoteNo summary" },
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

    const result = { posPayment_data: response, totalData, state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 } };
    await redisSet(cacheKey, result, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Payment"), result, {}));
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

    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `posPayment:one:req:${JSON.stringify(req.params)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Payment"), cachedData, {}));

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
          { path: "invoiceId", select: "invoiceNo transactionSummary items" },
          { path: "salesCreditNoteId", select: "creditNoteNo summary productDetails" },
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

    await redisSet(cacheKey, response, 3600);
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

    if (isExist.voucherType === POS_VOUCHER_TYPE.SALES && isExist.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      if (isExist.posOrderId) {
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

      if (isExist.invoiceId) {
        const invoice = await getFirstMatch(InvoiceModel, { _id: isExist.invoiceId, isDeleted: false }, {}, {});
        if (invoice) {
          invoice.paidAmount = (invoice.paidAmount || 0) - (isExist.amount || 0);
          const totalAmount = invoice.transactionSummary?.netAmount || 0;
          invoice.balanceAmount = Math.max(0, totalAmount - invoice.paidAmount);

          if (invoice.balanceAmount <= 0) {
            invoice.paymentStatus = INVOICE_PAYMENT_STATUS.PAID;
            invoice.balanceAmount = 0;
          } else if (invoice.paidAmount > 0) {
            invoice.paymentStatus = INVOICE_PAYMENT_STATUS.PARTIAL;
          } else {
            invoice.paymentStatus = INVOICE_PAYMENT_STATUS.UNPAID;
          }
          await updateData(InvoiceModel, { _id: isExist.invoiceId }, invoice, {});
        }
      }
    }

    if (isExist.voucherType === POS_VOUCHER_TYPE.PURCHASE && isExist.paymentType === POS_PAYMENT_TYPE.AGAINST_BILL) {
      if (isExist.purchaseBillId) {
        const supplierBill = await getFirstMatch(supplierBillModel, { _id: isExist.purchaseBillId, isDeleted: false }, {}, {});
        if (supplierBill) {
          const totalBillAmount = supplierBill.summary?.netAmount || supplierBill.totalAmount || 0;
          supplierBill.paidAmount = (supplierBill.paidAmount || 0) - (isExist.amount || 0);
          supplierBill.balanceAmount = totalBillAmount - supplierBill.paidAmount;

          if (supplierBill.balanceAmount <= 0) {
            supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.PAID;
            supplierBill.balanceAmount = 0;
          } else if (supplierBill.paidAmount > 0) {
            supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.PARTIAL;
          } else {
            supplierBill.paymentStatus = SUPPLIER_PAYMENT_STATUS.UNPAID;
          }
          await updateData(supplierBillModel, { _id: isExist.purchaseBillId }, supplierBill, {});
        }
      }

      if (isExist.posCreditNoteId) {
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

      if (isExist.salesCreditNoteId) {
        const salesCreditNote = await getFirstMatch(salesCreditNoteModel, { _id: isExist.salesCreditNoteId, isDeleted: false }, {}, {});
        if (salesCreditNote) {
          salesCreditNote.paidAmount = (salesCreditNote.paidAmount || 0) - (isExist.amount || 0);
          const totalAmount = salesCreditNote.summary?.netAmount || 0;
          salesCreditNote.balanceAmount = Math.max(0, totalAmount - salesCreditNote.paidAmount);

          if (salesCreditNote.balanceAmount <= 0) {
            salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.PAID;
            salesCreditNote.balanceAmount = 0;
          } else if (salesCreditNote.paidAmount > 0) {
            salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.DUE;
          } else {
            salesCreditNote.status = PURCHASE_DEBIT_NOTE_STATUS.OPEN;
          }
          await updateData(salesCreditNoteModel, { _id: isExist.salesCreditNoteId }, salesCreditNote, {});
        }
      }
    }

    const response = await updateData(PosPaymentModel, { _id: value?.id }, { isDeleted: true }, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("POS Payment"), {}, {}));
    }

    await redisdelPattern("posPayment:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("POS Payment"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getPendingPaymentDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = pendingPaymentDropDownSchema.validate(req.query);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const userType = user?.userType;
    const companyIdHeader = user?.companyId?._id;
    const branchIdHeader = user?.branchId?._id;
    const cacheKey = `posPayment:pendingPaymentDropdown:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyIdHeader}:branch:${branchIdHeader}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Pending Payment"), cachedData, {}));

    value.companyId = value.companyFilter;
    value.branchId = value.branchFilter;
    const companyId = await checkCompany(user, value);
    const branchId = await checkBranch(user, value);

    const baseCriteria: any = {
      isDeleted: false,
      paymentStatus: { $in: [POS_PAYMENT_STATUS.UNPAID, POS_PAYMENT_STATUS.PARTIAL] }
    };
    if (companyId) baseCriteria.companyId = companyId;
    if (branchId) baseCriteria.branchId = branchId;
    if (value.customerId) baseCriteria.customerId = value.customerId;

    let searchCriteria: any = { ...baseCriteria };
    if (value.search) {
      searchCriteria.orderNo = { $regex: value.search, $options: "i" };
    }
    searchCriteria = handleIncludeId(searchCriteria, value.includeId);

    const posOrders = await PosOrderModel.find(searchCriteria).select("orderNo paidAmount dueAmount customerId").lean();

    // Now for Invoices
    const invoiceCriteria: any = {
      isDeleted: false,
      paymentStatus: { $in: [POS_PAYMENT_STATUS.UNPAID, POS_PAYMENT_STATUS.PARTIAL] }
    };
    if (companyId) invoiceCriteria.companyId = companyId;
    if (branchId) invoiceCriteria.branchId = branchId;
    if (value.customerId) invoiceCriteria.customerId = value.customerId;

    let invSearchCriteria: any = { ...invoiceCriteria };
    if (value.search) {
      invSearchCriteria.invoiceNo = { $regex: value.search, $options: "i" };
    }
    invSearchCriteria = handleIncludeId(invSearchCriteria, value.includeId);

    const invoices = await InvoiceModel.find(invSearchCriteria).select("invoiceNo paidAmount balanceAmount customerId").lean();

    const response = [
      ...posOrders.map(o => ({
        _id: o._id,
        name: `${o.orderNo} (POS Order)`,
        docNo: o.orderNo,
        docType: "POS_ORDER",
        paidAmount: o.paidAmount || 0,
        balanceAmount: o.dueAmount || 0,
        customerId: o.customerId
      })),
      ...invoices.map(i => ({
        _id: i._id,
        name: `${i.invoiceNo} (Invoice)`,
        docNo: i.invoiceNo,
        docType: "INVOICE",
        paidAmount: i.paidAmount || 0,
        balanceAmount: i.balanceAmount || 0,
        customerId: i.customerId
      }))
    ];

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Pending Payment"), response, {}));
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getPendingCreditDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = pendingCreditDropDownSchema.validate(req.query);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const userType = user?.userType;
    const companyIdHeader = user?.companyId?._id;
    const branchIdHeader = user?.branchId?._id;
    const cacheKey = `posPayment:pendingCreditDropdown:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyIdHeader}:branch:${branchIdHeader}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Pending Credit"), cachedData, {}));

    value.companyId = value.companyFilter;
    value.branchId = value.branchFilter;
    const companyId = await checkCompany(user, value);
    const branchId = await checkBranch(user, value);

    const posCriteria: any = {
      isDeleted: false,
      status: POS_CREDIT_NOTE_STATUS.AVAILABLE,
      creditsRemaining: { $gt: 0 }
    };
    if (companyId) posCriteria.companyId = companyId;
    if (branchId) posCriteria.branchId = branchId;
    if (value.customerId) posCriteria.customerId = value.customerId;

    let posSearchCriteria: any = { ...posCriteria };
    if (value.search) {
      posSearchCriteria.creditNoteNo = { $regex: value.search, $options: "i" };
    }
    posSearchCriteria = handleIncludeId(posSearchCriteria, value.includeId);

    const posCredits = await posCreditNoteModel.find(posSearchCriteria).select("creditNoteNo creditsRemaining customerId totalAmount").lean();

    const salesCriteria: any = {
      isDeleted: false,
      status: { $in: [PURCHASE_DEBIT_NOTE_STATUS.OPEN, PURCHASE_DEBIT_NOTE_STATUS.DUE] }
    };
    if (companyId) salesCriteria.companyId = companyId;
    if (branchId) salesCriteria.branchId = branchId;
    if (value.customerId) salesCriteria.customerId = value.customerId;

    let salesSearchCriteria: any = { ...salesCriteria };
    if (value.search) {
      salesSearchCriteria.creditNoteNo = { $regex: value.search, $options: "i" };
    }
    salesSearchCriteria = handleIncludeId(salesSearchCriteria, value.includeId);

    const salesCredits = await salesCreditNoteModel.find(salesSearchCriteria).select("creditNoteNo customerId summary status balanceAmount").lean();

    const response = [
      ...posCredits.map(c => ({
        _id: c._id,
        name: `${c.creditNoteNo} (POS Credit Note)`,
        docNo: c.creditNoteNo,
        docType: "POS_CREDIT_NOTE",
        totalAmount: c.totalAmount || 0,
        balanceAmount: c.creditsRemaining || 0,
        customerId: c.customerId
      })),
      ...salesCredits.map(c => ({
        _id: c._id,
        name: `${c.creditNoteNo} (Sales Credit Note)`,
        docNo: c.creditNoteNo,
        docType: "SALES_CREDIT_NOTE",
        totalAmount: c.summary?.netAmount || 0,
        balanceAmount: c.balanceAmount !== undefined ? c.balanceAmount : (c.summary?.netAmount || 0),
        customerId: c.customerId
      }))
    ];

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Pending Credit"), response, {}));
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
