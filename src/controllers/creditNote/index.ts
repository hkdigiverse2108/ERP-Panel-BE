import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { contactModel, creditNoteModel, InvoiceModel, productModel, taxModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addCreditNoteSchema, deleteCreditNoteSchema, editCreditNoteSchema, getCreditNoteSchema } from "../../validation/creditNote";

const ObjectId = require("mongoose").Types.ObjectId;

// Generate unique credit note number
const generateCreditNoteNo = async (companyId): Promise<string> => {
  const count = await creditNoteModel.countDocuments({ companyId, isDeleted: false });
  const prefix = "CN";
  const number = String(count + 1).padStart(6, "0");
  return `${prefix}${number}`;
};

export const addCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = addCreditNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    // Validate customer exists
    if (!(await checkIdExist(contactModel, value?.customerId, "Customer", res))) return;

    // Validate invoice if provided
    if (value.invoiceId && !(await checkIdExist(InvoiceModel, value.invoiceId, "Invoice", res))) return;

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // Generate document number if not provided
    if (!value.documentNo) {
      value.documentNo = await generateCreditNoteNo(companyId);
    }

    // Get customer name
    const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
    if (customer) {
      value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
    }

    // Calculate totals if not provided
    if (!value.grossAmount) {
      value.grossAmount = value.items.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
    }
    if (value.netAmount === undefined || value.netAmount === null) {
      value.netAmount = (value.grossAmount || 0) - (value.discountAmount || 0) + (value.taxAmount || 0) + (value.roundOff || 0);
    }

    const creditNoteData = {
      ...value,
      companyId,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(creditNoteModel, creditNoteData);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editCreditNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(creditNoteModel, { _id: value?.creditNoteId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Credit Note"), {}, {}));
    }

    // Validate customer if being changed
    if (value.customerId && value.customerId !== isExist.customerId.toString()) {
      if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
      const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customer) {
        value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
      }
    }

    // Validate invoice if being changed
    if (value.invoiceId && value.invoiceId !== isExist.invoiceId?.toString()) {
      if (!(await checkIdExist(InvoiceModel, value.invoiceId, "Invoice", res))) return;
    }

    // Validate products if items are being updated
    if (value.items && value.items.length > 0) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      }

      // Recalculate totals
      value.grossAmount = value.items.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
      value.netAmount = (value.grossAmount || 0) - (value.discountAmount || 0) + (value.taxAmount || 0) + (value.roundOff || 0);
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(creditNoteModel, { _id: value?.creditNoteId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Credit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteCreditNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(creditNoteModel, value?.id, "Credit Note", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(creditNoteModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Credit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page = 1, limit = 10, search, status, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (search) {
      criteria.$or = [{ documentNo: { $regex: search, $options: "i" } }, { customerName: { $regex: search, $options: "i" } }, { reason: { $regex: search, $options: "i" } }];
    }

    if (status) {
      criteria.status = status;
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
        { path: "customerId", select: "firstName lastName companyName email phoneNo" },
        { path: "invoiceId", select: "documentNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(creditNoteModel, criteria, {}, options);
    const totalData = await countData(creditNoteModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Credit Note"), { creditNote_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getCreditNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      creditNoteModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "customerId", select: "firstName lastName companyName email phoneNo addressDetails" },
          { path: "invoiceId", select: "documentNo date netAmount" },
          { path: "items.productId", select: "name itemCode sellingPrice mrp" },
          { path: "items.taxId", select: "name percentage type" },
        ],
      }
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Credit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
