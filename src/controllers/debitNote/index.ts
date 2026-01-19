import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { contactModel, debitNoteModel, supplierBillModel, productModel, taxModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addDebitNoteSchema, deleteDebitNoteSchema, editDebitNoteSchema, getDebitNoteSchema } from "../../validation/debitNote";

const ObjectId = require("mongoose").Types.ObjectId;

// Generate unique debit note number
const generateDebitNoteNo = async (companyId): Promise<string> => {
  const count = await debitNoteModel.countDocuments({ companyId, isDeleted: false });
  const prefix = "DN";
  const number = String(count + 1).padStart(6, "0");
  return `${prefix}${number}`;
};

export const addDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = addDebitNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    // Validate supplier exists
    if (!(await checkIdExist(contactModel, value?.supplierId, "Supplier", res))) return;

    // Validate supplier bill if provided
    if (value.supplierBillId && !(await checkIdExist(supplierBillModel, value.supplierBillId, "Supplier Bill", res))) return;

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // Generate document number if not provided
    if (!value.documentNo) {
      value.documentNo = await generateDebitNoteNo(companyId);
    }

    // Get supplier name
    const supplier = await getFirstMatch(contactModel, { _id: value.supplierId, isDeleted: false }, {}, {});
    if (supplier) {
      value.supplierName = supplier.companyName || `${supplier.firstName} ${supplier.lastName || ""}`.trim();
    }

    // Calculate totals if not provided
    if (!value.grossAmount) {
      value.grossAmount = value.items.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
    }
    if (value.netAmount === undefined || value.netAmount === null) {
      value.netAmount = (value.grossAmount || 0) - (value.discountAmount || 0) + (value.taxAmount || 0) + (value.roundOff || 0);
    }

    const debitNoteData = {
      ...value,
      companyId,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(debitNoteModel, debitNoteData);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Debit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editDebitNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(debitNoteModel, { _id: value?.debitNoteId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Debit Note"), {}, {}));
    }

    // Validate supplier if being changed
    if (value.supplierId && value.supplierId !== isExist.supplierId.toString()) {
      if (!(await checkIdExist(contactModel, value.supplierId, "Supplier", res))) return;
      const supplier = await getFirstMatch(contactModel, { _id: value.supplierId, isDeleted: false }, {}, {});
      if (supplier) {
        value.supplierName = supplier.companyName || `${supplier.firstName} ${supplier.lastName || ""}`.trim();
      }
    }

    // Validate supplier bill if being changed
    if (value.supplierBillId && value.supplierBillId !== isExist.supplierBillId?.toString()) {
      if (!(await checkIdExist(supplierBillModel, value.supplierBillId, "Supplier Bill", res))) return;
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

    const response = await updateData(debitNoteModel, { _id: value?.debitNoteId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Debit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Debit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteDebitNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(debitNoteModel, value?.id, "Debit Note", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(debitNoteModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Debit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Debit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page = 1, limit = 10, search, status, startDate, endDate, activeFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (search) {
      criteria.$or = [{ documentNo: { $regex: search, $options: "si" } }, { supplierName: { $regex: search, $options: "si" } }, { reason: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

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
        { path: "supplierId", select: "firstName lastName companyName email phoneNo" },
        { path: "supplierBillId", select: "documentNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(debitNoteModel, criteria, {}, options);
    const totalData = await countData(debitNoteModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Debit Note"), { debitNote_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getDebitNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      debitNoteModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "supplierId", select: "firstName lastName companyName email phoneNo address" },
          { path: "supplierBillId", select: "documentNo date netAmount" },
          { path: "items.productId", select: "name itemCode purchasePrice landingCost" },
          { path: "items.taxId", select: "name percentage type" },
          { path: "companyId", select: "name " },
          { path: "branchId", select: "name " },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Debit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Debit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
