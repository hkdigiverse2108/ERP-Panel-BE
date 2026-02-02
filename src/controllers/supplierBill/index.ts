import { apiResponse, HTTP_STATUS } from "../../common";
import { contactModel, supplierBillModel,  productModel, termsConditionModel, additionalChargeModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, generateSequenceNumber, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addSupplierBillSchema, deleteSupplierBillSchema, editSupplierBillSchema, getSupplierBillSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

// Generate unique supplier bill number
// const generateSupplierBillNo = async (companyId): Promise<string> => {
//   const count = await supplierBillModel.countDocuments({ companyId, isDeleted: false });
//   const prefix = "SB";
//   const number = String(count + 1).padStart(6, "0");
//   return `${prefix}${number}`;
// };

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
    // if (value.purchaseOrderId && !(await checkIdExist(purchaseOrderModel, value.purchaseOrderId, "Purchase Order", res))) return;

    if (value?.termsAndConditionIds) {
      for (const item of value?.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, item, "terms And Condition ", res))) return;
      }
    }

    // Validate products exist if provided
    if (value?.productDetails?.item && value?.productDetails?.item?.length > 0) {
      for (const item of value?.productDetails.item) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value?.returnProductDetails?.item && value?.returnProductDetails?.item?.length > 0) {
      for (const item of value.returnProductDetails?.item) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value?.additionalCharges?.item && value.additionalCharges?.item?.length > 0) {
      for (const item of value.additionalCharges?.item) {
        if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
      }
    }

    // Generate bill number if not provided
    if (!value?.supplierBillNo) {
      value.supplierBillNo = await generateSequenceNumber({ model: supplierBillModel, prefix: "SB", fieldName: "supplierBillNo", companyId: value.companyId });
    }
    if (!value?.referenceBillNo) {
      value.referenceBillNo = await generateSequenceNumber({ model: supplierBillModel, prefix: "REF", fieldName: "referenceBillNo", companyId: value.companyId });
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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
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
    if (value?.supplierId && value?.supplierId !== isExist?.supplierId.toString()) {
      if (!(await checkIdExist(contactModel, value?.supplierId, "Supplier", res))) return;
    }

    if (value?.termsAndConditionIds) {
      for (const item of value?.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, item, "terms And Condition ", res))) return;
      }
    }

    // Validate products if items are being updated
    if (value?.productDetails?.item && value?.productDetails?.item?.length > 0) {
      for (const item of value?.productDetails?.item) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value?.returnProductDetails?.item && value?.returnProductDetails?.item?.length > 0) {
      for (const item of value.returnProductDetails?.item) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
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
    let { page = 1, limit = 10, search, activeFilter, companyFilter, statusFilter, paymentStatus, startDate, endDate } = req.query;

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
      criteria.$or = [{ supplierBillNo: { $regex: search, $options: "si" } }, { referenceBillNo: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter === "true";

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    if (paymentStatus) {
      criteria.paymentStatus = paymentStatus;
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.supplierBillDate = { $gte: start, $lte: end };
      }
    }

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "supplierId", select: "firstName lastName companyName email phoneNo" },
        // { path: "purchaseOrderId", select: "orderNo" },
        { path: "productDetails.item.productId", select: "name itemCode purchasePrice" },
        { path: "returnProductDetails.item.productId", select: "name itemCode" },
        { path: "additionalCharges.item.chargeId", select: "name type" },
        { path: "termsAndConditionIds", select: "termsCondition" },
        { path: "companyId", select: "name" },
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
          { path: "supplierId", select: "firstName lastName companyName email phoneNo address contactType" },
          { path: "productDetails.item.productId", select: "name itemCode purchasePrice hsn gst" },
          { path: "returnProductDetails.item.productId", select: "name itemCode purchasePrice" },
          { path: "additionalCharges.item.chargeId", select: " name type" },
          { path: "termsAndConditionIds", select: "termsCondition" },
          { path: "companyId", select: "name gstNo" },
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
      criteria.$or = [{ supplierBillNo: { $regex: search, $options: "si" } }, { referenceBillNo: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { supplierBillDate: -1 },
      limit: search ? 50 : 1000,
      populate: [{ path: "supplierId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(
      supplierBillModel,
      criteria,
      {
        supplierBillNo: 1,
        supplierBillDate: 1,
        "summary.netAmount": 1,
        balanceAmount: 1,
        paymentStatus: 1,
      },
      options,
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.supplierBillNo,
      supplierBillNo: item.supplierBillNo,
      supplierBillDate: item.supplierBillDate,
      netAmount: item.summary?.netAmount || 0,
      balanceAmount: item.balanceAmount,
      paymentStatus: item.paymentStatus,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Supplier Bill Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
