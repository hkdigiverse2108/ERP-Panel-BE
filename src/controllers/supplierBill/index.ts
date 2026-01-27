import { HTTP_STATUS, VALUE_TYPE } from "../../common";
import { apiResponse } from "../../common/utils";
import { contactModel, supplierBillModel, purchaseOrderModel, productModel, taxModel, termsConditionModel, additionalChargeModel } from "../../database";
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

// Calculate discount amount
const calculateDiscount = (amount: number, discount: any): number => {
  if (!discount || !discount.value) return 0;
  if (discount.type === VALUE_TYPE.PERCENTAGE) {
    return (amount * discount.value) / 100;
  }
  return discount.value; // Fixed amount
};

// Calculate line item total with discounts
const calculateLineItemTotal = (item: any): any => {
  const baseAmount = (item.qty || 0) * (item.unitCost || 0);

  // Calculate discounts
  const discount1 = calculateDiscount(baseAmount, item.discount1);
  const discount2 = calculateDiscount(baseAmount - discount1, item.discount2);

  const totalDiscount = discount1 + discount2;
  const taxableAmount = baseAmount - totalDiscount;

  return {
    baseAmount,
    discount1Amount: discount1,
    discount2Amount: discount2,
    totalDiscount,
    taxableAmount,
    taxAmount: 0, // Will be calculated if tax is applied
    total: taxableAmount,
  };
};

// Calculate return item total with discounts
const calculateReturnItemTotal = (item: any): any => {
  const baseAmount = (item.qty || 0) * (item.unitCost || 0);

  const discount1 = calculateDiscount(baseAmount, item.discount1);
  const discount2 = calculateDiscount(baseAmount - discount1, item.discount2);

  const totalDiscount = discount1 + discount2;
  const taxableAmount = baseAmount - totalDiscount;

  return {
    baseAmount,
    discount1Amount: discount1,
    discount2Amount: discount2,
    totalDiscount,
    taxableAmount,
    taxAmount: 0,
    total: taxableAmount,
  };
};

// Calculate additional charges total
const calculateAdditionalChargesTotal = (charges: any[]): { total: number; taxableTotal: number } => {
  let total = 0;
  let taxableTotal = 0;

  if (charges && charges.length > 0) {
    charges.forEach((charge) => {
      const chargeValue = charge.value || 0;
      total += chargeValue;

      // If tax rate is provided, calculate taxable amount
      if (charge.taxRate) {
        const taxAmount = (chargeValue * charge.taxRate) / 100;
        charge.total = chargeValue + taxAmount;
        taxableTotal += charge.total;
      } else {
        charge.total = chargeValue;
        taxableTotal += chargeValue;
      }
    });
  }

  return { total, taxableTotal };
};

// Main calculation function for supplier bill
const calculateSupplierBillSummary = (value: any): any => {
  const summary = {
    grossAmount: 0,
    itemDiscount: 0,
    taxableAmount: 0,
    itemTax: 0,
    additionalChargeAmount: 0,
    additionalChargeTax: 0,
    billDiscount: 0,
    flatDiscount: value.summary?.flatDiscount || {},
    roundOff: value.summary?.roundOff || 0,
    netAmount: 0,
  };

  let grossAmount = 0;
  let totalDiscount = 0;
  let totalTaxableAmount = 0;
  let totalTax = 0;

  // Calculate product details
  if (value.productDetails && value.productDetails.length > 0) {
    value.productDetails.forEach((item: any) => {
      const itemCalc = calculateLineItemTotal(item);

      item.baseAmount = itemCalc.baseAmount;
      item.discount1 = item.discount1 || {};
      item.discount2 = item.discount2 || {};
      item.taxableAmount = itemCalc.taxableAmount;
      item.taxAmount = itemCalc.taxAmount;
      item.total = itemCalc.total;

      grossAmount += itemCalc.baseAmount;
      totalDiscount += itemCalc.totalDiscount;
      totalTaxableAmount += itemCalc.taxableAmount;
    });
  }

  // Calculate return products (subtract from total)
  let returnAmount = 0;
  if (value.returnProductDetails && value.returnProductDetails.length > 0) {
    value.returnProductDetails.forEach((item: any) => {
      const itemCalc = calculateReturnItemTotal(item);

      item.baseAmount = itemCalc.baseAmount;
      item.discount1 = item.discount1 || {};
      item.discount2 = item.discount2 || {};
      item.taxableAmount = itemCalc.taxableAmount;
      item.taxAmount = itemCalc.taxAmount;
      item.total = itemCalc.total;

      returnAmount += itemCalc.total;
    });
  }

  grossAmount = Math.max(0, grossAmount - returnAmount);

  // Calculate flat discount
  let flatDiscountAmount = 0;
  if (value.summary?.flatDiscount) {
    flatDiscountAmount = calculateDiscount(grossAmount, value.summary.flatDiscount);
  }

  // Calculate additional charges
  const chargesCalc = calculateAdditionalChargesTotal(value.additionalCharges || []);

  summary.grossAmount = grossAmount;
  summary.itemDiscount = totalDiscount;
  summary.taxableAmount = totalTaxableAmount - flatDiscountAmount;
  summary.itemTax = totalTax;
  summary.additionalChargeAmount = chargesCalc.total;
  summary.additionalChargeTax = chargesCalc.taxableTotal - chargesCalc.total;
  summary.billDiscount = flatDiscountAmount;
  summary.roundOff = value.summary?.roundOff || 0;

  // Calculate net amount
  summary.netAmount = summary.grossAmount - summary.itemDiscount - summary.billDiscount + summary.itemTax + summary.additionalChargeAmount + summary.additionalChargeTax + summary.roundOff;

  return summary;
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
    if (value.termsAndConditionId && !(await checkIdExist(termsConditionModel, value.termsAndConditionId, "terms And Condition ", res))) return;

    // Validate products exist if provided
    if (value.productDetails && value.productDetails.length > 0) {
      for (const item of value.productDetails) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value.returnProductDetails && value.returnProductDetails.length > 0) {
      for (const item of value.returnProductDetails) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value.additionalCharges && value.additionalCharges.length > 0) {
      for (const item of value.additionalCharges) {
        if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
      }
    }

    // Generate bill number if not provided
    if (!value.supplierBillNo) {
      value.supplierBillNo = await generateSupplierBillNo(value.companyId);
    }

    // Get supplier details
    const supplier = await getFirstMatch(contactModel, { _id: value.supplierId, isDeleted: false }, {}, {});
    if (supplier) {
      value.supplierName = supplier.companyName || `${supplier.firstName} ${supplier.lastName || ""}`.trim();
    }

    // Calculate summary with all items, discounts, and charges
    value.summary = calculateSupplierBillSummary(value);

    // Calculate balance amount
    const netAmount = value.summary.netAmount;
    value.paidAmount = value.paidAmount || 0;
    value.balanceAmount = Math.max(0, netAmount - value.paidAmount);

    // Set payment status based on paid amount and net amount
    if (value.paidAmount === 0) {
      value.paymentStatus = "unpaid";
    } else if (value.paidAmount >= netAmount) {
      value.paymentStatus = "paid";
    } else {
      value.paymentStatus = "partial";
    }

    // Set audit fields
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
    if (value.productDetails && value.productDetails.length > 0) {
      for (const item of value.productDetails) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value.returnProductDetails && value.returnProductDetails.length > 0) {
      for (const item of value.returnProductDetails) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    // Merge with existing data and prepare for calculation
    let updateData_obj: any = {
      ...isExist,
      ...value,
      _id: isExist._id,
    };

    // Recalculate summary if any pricing/item data changed
    if (value.productDetails || value.returnProductDetails || value.additionalCharges || value.summary?.flatDiscount !== undefined) {
      updateData_obj.summary = calculateSupplierBillSummary(updateData_obj);
    } else if (!updateData_obj.summary) {
      // If no summary exists, calculate it
      updateData_obj.summary = calculateSupplierBillSummary(updateData_obj);
    }

    // Recalculate balance and payment status
    const netAmount = updateData_obj.summary.netAmount;
    const paidAmount = value.paidAmount !== undefined ? value.paidAmount : isExist.paidAmount;

    updateData_obj.paidAmount = paidAmount;
    updateData_obj.balanceAmount = Math.max(0, netAmount - paidAmount);

    // Update payment status based on paid amount and net amount
    if (paidAmount === 0) {
      updateData_obj.paymentStatus = "unpaid";
    } else if (paidAmount >= netAmount) {
      updateData_obj.paymentStatus = "paid";
    } else {
      updateData_obj.paymentStatus = "partial";
    }

    updateData_obj.updatedBy = user?._id || null;

    const response = await updateData(supplierBillModel, { _id: value?.supplierBillId }, updateData_obj, {});

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
      criteria.$or = [{ supplierBillNo: { $regex: search, $options: "si" } }, { referenceBillNo: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter === "true";

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
        criteria.supplierBillDate = { $gte: start, $lte: end };
      }
    }

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "supplierId", select: "firstName lastName companyName email phoneNo" },
        { path: "purchaseOrderId", select: "orderNo" },
        { path: "productDetails.productId", select: "name itemCode purchasePrice" },
        { path: "returnProductDetails.productId", select: "name itemCode" },
        { path: "additionalCharges.chargeId", select: "name type" },
        { path: "termsAndConditionId", select: "termsCondition" },
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
          { path: "purchaseOrderId", select: "orderNo" },
          { path: "productDetails.productId", select: "name itemCode purchasePrice hsn gst" },
          { path: "returnProductDetails.productId", select: "name itemCode purchasePrice" },
          { path: "additionalCharges.chargeId", select: " name type" },
          { path: "termsAndConditionId", select: "termsCondition" },
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
