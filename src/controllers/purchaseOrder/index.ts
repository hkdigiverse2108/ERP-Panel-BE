import { apiResponse, HTTP_STATUS, ORDER_STATUS } from "../../common";
import { contactModel, purchaseOrderModel, productModel, companyModel, termsConditionModel, uomModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, generateSequenceNumber } from "../../helper";
import { addPurchaseOrderSchema, deletePurchaseOrderSchema, editPurchaseOrderSchema, getPurchaseOrderSchema } from "../../validation/purchaseOrder";

const ObjectId = require("mongoose").Types.ObjectId;

export const addPurchaseOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addPurchaseOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate supplier exists
    if (!(await checkIdExist(companyModel, value?.companyId, "Company", res))) return;
    if (!(await checkIdExist(contactModel, value?.supplierId, "Supplier", res))) return;

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
    }

    for (const item of value.termsAndConditionIds) {
      if (!(await checkIdExist(termsConditionModel, item, "terms And Condition ", res))) return;
    }

    if (!value.orderNo) {
      value.orderNo = await generateSequenceNumber({ model: purchaseOrderModel, prefix: "PO", fieldName: "orderNo", companyId: value.companyId });
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(purchaseOrderModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Purchase Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editPurchaseOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editPurchaseOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(purchaseOrderModel, { _id: value?.purchaseOrderId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Purchase Order"), {}, {}));
    }

    // Validate supplier if being changed
    if (value.supplierId && value.supplierId !== isExist.supplierId.toString()) {
      if (!(await checkIdExist(contactModel, value.supplierId, "Supplier", res))) return;
    }

    // Validate products if items are being updated
    if (value.items && value.items.length > 0) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        // if (!(await checkIdExist(uomModel, item?.uomId, "UOM", res))) return;
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(purchaseOrderModel, { _id: value?.purchaseOrderId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Purchase Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Purchase Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deletePurchaseOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deletePurchaseOrderSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(purchaseOrderModel, value?.id, "Purchase Order", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(purchaseOrderModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Purchase Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Purchase Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPurchaseOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, statusFilter, startDate, endDate, activeFilter, companyFilter, supplierFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (supplierFilter) {
      criteria.supplierId = supplierFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ orderNo: { $regex: search, $options: "si" } }];
    }

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "orderDate");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "supplierId", select: "firstName lastName companyName email phoneNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(purchaseOrderModel, criteria, {}, options);
    const totalData = await countData(purchaseOrderModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Purchase Order"), { purchaseOrder_data: response, state, totalData }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOnePurchaseOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPurchaseOrderSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      purchaseOrderModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "supplierId", select: "firstName lastName companyName email phoneNo address" },
          { path: "items.productId", select: "name itemCode purchasePrice landingCost" },
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Purchase Order"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Purchase Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Purchase Order Dropdown API
export const getPurchaseOrderDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { supplierId, supplierFilter, status, statusFilter, search, companyFilter } = req.query;

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    const sId = supplierId || supplierFilter;
    if (sId) {
      criteria.supplierId = sId;
    }

    const st = status || statusFilter;
    if (st) {
      criteria.status = st;
    } else {
      criteria.status = { $in: [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.PARTIALLY_DELIVERED] };
    }

    if (search) {
      criteria.$or = [{ orderNo: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { createdAt: -1 },
      limit: search ? 50 : 1000,
      populate: [{ path: "supplierId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(purchaseOrderModel, criteria, {}, options);

    const dropdownData = response.map((item: any) => ({
      _id: item._id,
      orderNo: item.orderNo,
      supplierName: item.supplierId?.companyName || `${item.supplierId?.firstName || ""} ${item.supplierId?.lastName || ""}`.trim(),
      date: item.orderDate,
      netAmount: item.summary?.netAmount,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Purchase Order Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
