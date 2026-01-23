import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { contactModel, supplierBillModel, purchaseOrderModel, productModel, taxModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addSupplierBillSchema, deleteSupplierBillSchema, editSupplierBillSchema, getSupplierBillSchema } from "../../validation/supplierBill";

const ObjectId = require("mongoose").Types.ObjectId;

// Generate unique supplier bill number
const generateSupplierBillNo = async (companyId): Promise<string> => {
  const count = await supplierBillModel.countDocuments({ companyId, isDeleted: false });
  const prefix = "SB";
  const number = String(count + 1).padStart(6, "0");
  return `${prefix}${number}`;
};

export const addSupplierBill = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addSupplierBillSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }
    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate supplier exists
    if (!(await checkIdExist(contactModel, value?.supplierId, "Supplier", res))) return;

    // Validate purchase order if provided
    if (value.purchaseOrderId && !(await checkIdExist(purchaseOrderModel, value.purchaseOrderId, "Purchase Order", res))) return;

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // Generate document number if not provided
    if (!value.documentNo) {
      value.documentNo = await generateSupplierBillNo(value.companyId);
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

    // Calculate balance amount
    value.balanceAmount = (value.netAmount || 0) - (value.paidAmount || 0);

    // Set payment status based on paid amount
    if (!value.paymentStatus) {
      if (value.paidAmount === 0) {
        value.paymentStatus = "unpaid";
      } else if (value.paidAmount >= value.netAmount) {
        value.paymentStatus = "paid";
      } else {
        value.paymentStatus = "partial";
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(supplierBillModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Supplier Bill"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editSupplierBill = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editSupplierBillSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(supplierBillModel, { _id: value?.supplierBillId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Supplier Bill"), {}, {}));
    }

    // Validate supplier if being changed
    if (value.supplierId && value.supplierId !== isExist.supplierId.toString()) {
      if (!(await checkIdExist(contactModel, value.supplierId, "Supplier", res))) return;
      const supplier = await getFirstMatch(contactModel, { _id: value.supplierId, isDeleted: false }, {}, {});
      if (supplier) {
        value.supplierName = supplier.companyName || `${supplier.firstName} ${supplier.lastName || ""}`.trim();
      }
    }

    // Validate purchase order if being changed
    if (value.purchaseOrderId && value.purchaseOrderId !== isExist.purchaseOrderId?.toString()) {
      if (!(await checkIdExist(purchaseOrderModel, value.purchaseOrderId, "Purchase Order", res))) return;
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

    // Recalculate balance and payment status
    value.balanceAmount = (value.netAmount || isExist.netAmount) - (value.paidAmount !== undefined ? value.paidAmount : isExist.paidAmount);
    if (value.paidAmount !== undefined) {
      const paidAmt = value.paidAmount;
      const netAmt = value.netAmount || isExist.netAmount;
      if (paidAmt === 0) {
        value.paymentStatus = "unpaid";
      } else if (paidAmt >= netAmt) {
        value.paymentStatus = "paid";
      } else {
        value.paymentStatus = "partial";
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(supplierBillModel, { _id: value?.supplierBillId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Supplier Bill"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Supplier Bill"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteSupplierBill = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteSupplierBillSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(supplierBillModel, value?.id, "Supplier Bill", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(supplierBillModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Supplier Bill"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Supplier Bill"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllSupplierBill = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page = 1, limit = 10, search, activeFilter, companyFilter, status, paymentStatus, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.$or = [{ documentNo: { $regex: search, $options: "si" } }, { supplierName: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "                  ";

    if (status) {
      criteria.status = status;
    }

    if (paymentStatus) {
      criteria.paymentStatus = paymentStatus;
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
        { path: "purchaseOrderId", select: "documentNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(supplierBillModel, criteria, {}, options);
    const totalData = await countData(supplierBillModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Supplier Bill"), { supplierBill_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneSupplierBill = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getSupplierBillSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      supplierBillModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "supplierId", select: "firstName lastName companyName email phoneNo address" },
          { path: "purchaseOrderId", select: "documentNo date netAmount" },
          { path: "materialInwardId", select: "documentNo" },
          { path: "items.productId", select: "name itemCode purchasePrice landingCost" },
          { path: "items.taxId", select: "name percentage type" },
          { path: "companyId", select: "name " },
          { path: "branchId", select: "name " },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Supplier Bill"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Supplier Bill"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getSupplierBillDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { supplierId, status, paymentStatus, search } = req.query; // Optional filters

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (supplierId) {
      criteria.supplierId = supplierId;
    }

    if (status) {
      criteria.status = status;
    } else {
      // Default: only show active bills
      criteria.status = "active";
    }

    if (paymentStatus) {
      criteria.paymentStatus = paymentStatus;
    }

    if (search) {
      criteria.$or = [{ documentNo: { $regex: search, $options: "si" } }, { supplierName: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { createdAt: -1 },
      limit: search ? 50 : 1000,
      populate: [{ path: "supplierId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(supplierBillModel, criteria, { documentNo: 1, supplierName: 1, date: 1, netAmount: 1, balanceAmount: 1 }, options);

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.documentNo,
      documentNo: item.documentNo,
      supplierName: item.supplierName,
      date: item.date,
      netAmount: item.netAmount,
      balanceAmount: item.balanceAmount,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Supplier Bill Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
