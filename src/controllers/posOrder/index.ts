import { HTTP_STATUS, VOUCHAR_TYPE } from "../../common";
import { apiResponse } from "../../common/utils";
import { contactModel, productModel, taxModel, branchModel, InvoiceModel } from "../../database";
import { PosOrderModel } from "../../database/model/posOrder";
import { PosCashControlModel } from "../../database/model/posCashControl";
import { voucherModel } from "../../database/model/voucher";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addPosOrderSchema, deletePosOrderSchema, editPosOrderSchema, getPosOrderSchema, holdPosOrderSchema, releasePosOrderSchema, convertToInvoiceSchema, getPosCashControlSchema, updatePosCashControlSchema, getCustomerLoyaltyPointsSchema, redeemLoyaltyPointsSchema, getCombinedPaymentsSchema } from "../../validation/posOrder";

const ObjectId = require("mongoose").Types.ObjectId;

// Generate unique POS order number
const generatePosOrderNo = async (companyId: any): Promise<string> => {
  const count = await PosOrderModel.countDocuments({ companyId, isDeleted: false });
  const prefix = "POS";
  const number = String(count + 1).padStart(6, "0");
  return `${prefix}${number}`;
};

export const addPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = addPosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    // Validate location if provided

    if (!(await checkIdExist(branchModel, value.branchId, "Branch", res))) return;

    // Validate customer if provided
    if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (!(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // Generate order number if not provided
    if (!value.orderNo) {
      value.orderNo = await generatePosOrderNo(companyId);
    }

    // Get customer name if customer provided
    if (value.customerId) {
      const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customer) {
        value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
      }
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

    // Set hold date if status is hold
    if (value.status === "hold") {
      value.holdDate = new Date();
    }

    const posOrderData = {
      ...value,
      companyId,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(PosOrderModel, posOrderData);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
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

    // Validate location if being changed
    if (value.branchId && value.branchId !== isExist.branchId?.toString()) {
      if (!(await checkIdExist(branchModel, value.branchId, "Location", res))) return;
    }

    // Validate customer if being changed
    if (value.customerId && value.customerId !== isExist.customerId?.toString()) {
      if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
      const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customer) {
        value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
      }
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

    // Update hold date if status is being changed to hold
    if (value.status === "hold" && isExist.status !== "hold") {
      value.holdDate = new Date();
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(PosOrderModel, { _id: value?.posOrderId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("POS Order"), {}, {}));
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
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS 0"), {}, {}));
    }

    if (isExist?.status === "hold") {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.posAlreadyOnHold, {}, {}));
    }

    const payload = {
      status: "hold",
      holdDate: new Date(),
      updatedBy: user?._id || null,
    };

    const response = await updateData(PosOrderModel, { _id: value?.posOrderId }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("POS Order"), {}, {}));

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

    if (isExist.status !== "hold") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Order is not on hold", {}, {}));
    }

    const payload = {
      status: "pending",
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
    let { page = 1, limit = 10, search, activeFilter, status, paymentStatus, branchId, tableNo, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ orderNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }, { tableNo: { $regex: search, $options: "si" } }];
    }

    if (status) {
      criteria.status = status;
    }

    if (paymentStatus) {
      criteria.paymentStatus = paymentStatus;
    }

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (tableNo) {
      criteria.tableNo = tableNo;
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
        { path: "customerId", select: "firstName lastName companyName email phoneNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "invoiceId", select: "documentNo" },
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
          { path: "branchId", select: "name address" },
          { path: "companyId", select: "name" },

          { path: "customerId", select: "firstName lastName companyName email phoneNo address" },
          { path: "items.productId", select: "name itemCode sellingPrice mrp" },
          { path: "items.taxId", select: "name percentage type" },
          { path: "invoiceId", select: "documentNo date netAmount" },
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

    let criteria: any = { isDeleted: false, status: "hold" };
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
        { path: "customerId", select: "firstName lastName companyName" },
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

// POS Cash Control - Get/Update opening cash balance
export const getPosCashControl = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = getPosCashControlSchema.validate(req.query);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { locationId, date } = value;

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    if (!locationId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Location ID is required", {}, {}));
    }

    // Validate location
    if (!(await checkIdExist(branchModel, locationId, "Location", res))) return;

    // Use today's date if not provided
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Find or create cash control for the day
    let cashControl = await getFirstMatch(
      PosCashControlModel,
      { companyId, locationId, date: targetDate, isDeleted: false },
      {},
      {
        populate: [
          { path: "locationId", select: "name" },
          { path: "closedBy", select: "firstName lastName" },
        ],
      },
    );

    // If not found, create a new one with default values
    if (!cashControl) {
      // Get yesterday's closing cash as today's opening cash
      const yesterday = new Date(targetDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayCash = await getFirstMatch(PosCashControlModel, { companyId, locationId, date: yesterday, isDeleted: false }, {}, {});

      const cashControlData = {
        companyId,
        locationId,
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

    const { locationId, date, openingCash, actualCash, notes, isClosed } = value;

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    if (!locationId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Location ID is required", {}, {}));
    }

    // Validate location
    if (!(await checkIdExist(branchModel, locationId, "Location", res))) return;

    // Use today's date if not provided
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Find existing cash control
    let cashControl = await getFirstMatch(PosCashControlModel, { companyId, locationId, date: targetDate, isDeleted: false }, {}, {});

    if (!cashControl) {
      // Create new if doesn't exist
      const cashControlData = {
        companyId,
        locationId,
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
      const updateData: any = {
        updatedBy: user?._id || null,
      };

      if (openingCash !== undefined) updateData.openingCash = openingCash;
      if (actualCash !== undefined) updateData.actualCash = actualCash;
      if (notes !== undefined) updateData.notes = notes;
      if (isClosed !== undefined) {
        updateData.isClosed = isClosed;
        if (isClosed) {
          updateData.closedBy = user?._id || null;
          updateData.closedAt = new Date();
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
            locationId: new ObjectId(locationId),
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

      const opening = updateData.openingCash !== undefined ? updateData.openingCash : cashControl.openingCash;
      updateData.expectedCash = opening + totalSales - totalExpenses;
      updateData.closingCash = updateData.actualCash !== undefined ? updateData.actualCash : cashControl.actualCash;
      updateData.difference = updateData.expectedCash - updateData.closingCash;

      cashControl = await updateData(PosCashControlModel, { _id: cashControl._id }, updateData, {});
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("POS Cash Control"), cashControl, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Get Customer Loyalty Points
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

// Redeem Loyalty Points
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

// Get Combined Payments (Receipt, Payment, Expense) for POS Payments modal
export const getCombinedPayments = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = getCombinedPaymentsSchema.validate(req.query);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let { page = 1, limit = 10, search, startDate, endDate, locationId } = value;

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
