import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { contactModel, SalesOrderModel, productModel, taxModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addSalesOrderSchema, deleteSalesOrderSchema, editSalesOrderSchema, getSalesOrderSchema } from "../../validation/salesOrder";

const ObjectId = require("mongoose").Types.ObjectId;

// Generate unique sales order number
const generateSalesOrderNo = async (companyId): Promise<string> => {
  const count = await SalesOrderModel.countDocuments({ companyId, isDeleted: false });
  const prefix = "SO";
  const number = String(count + 1).padStart(6, "0");
  return `${prefix}${number}`;
};

export const addSalesOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addSalesOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate customer exists
    if (!(await checkIdExist(contactModel, value?.customerId, "Customer", res))) return;

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // Generate document number if not provided
    if (!value.documentNo) {
      value.documentNo = await generateSalesOrderNo(value.companyId);
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

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(SalesOrderModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Sales Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editSalesOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editSalesOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(SalesOrderModel, { _id: value?.salesOrderId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Sales Order"), {}, {}));
    }

    // Validate customer if being changed
    if (value.customerId && value.customerId !== isExist.customerId.toString()) {
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

    value.updatedBy = user?._id || null;

    const response = await updateData(SalesOrderModel, { _id: value?.salesOrderId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Sales Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Sales Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteSalesOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteSalesOrderSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(SalesOrderModel, value?.id, "Sales Order", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(SalesOrderModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Sales Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Sales Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllSalesOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page = 1, limit = 10, search, status, startDate, endDate, activeFilter, companyFilter } = req.query;

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
      criteria.$or = [{ documentNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }];
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
        { path: "customerId", select: "firstName lastName companyName email phoneNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(SalesOrderModel, criteria, {}, options);
    const totalData = await countData(SalesOrderModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Order"), { salesOrder_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneSalesOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getSalesOrderSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      SalesOrderModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "customerId", select: "firstName lastName companyName email phoneNo address" },
          { path: "items.productId", select: "name itemCode sellingPrice mrp" },
          { path: "items.taxId", select: "name percentage type" },
          { path: "companyId", select: "name " },
          { path: "branchId", select: "name " },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Sales Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Sales Order Dropdown API
export const getSalesOrderDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { customerId, status, search } = req.query; // Optional filters

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (customerId) {
      criteria.customerId = customerId;
    }

    if (status) {
      criteria.status = status;
    } else {
      // Default: only show pending orders
      criteria.status = "pending";
    }

    if (search) {
      criteria.$or = [{ documentNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { createdAt: -1 },
      limit: search ? 50 : 1000,
      populate: [{ path: "customerId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(SalesOrderModel, criteria, { documentNo: 1, customerName: 1, date: 1, netAmount: 1 }, options);

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.documentNo,
      documentNo: item.documentNo,
      customerName: item.customerName,
      date: item.date,
      netAmount: item.netAmount,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Order Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
