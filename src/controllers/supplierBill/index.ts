import { apiResponse, HTTP_STATUS, PREFIX_MODULES, SUPPLIER_PAYMENT_STATUS } from "../../common";
import { contactModel, supplierBillModel, productModel, termsConditionModel, additionalChargeModel, stockModel } from "../../database";
import { applyDateFilter, checkBranch, checkCompany, checkIdExist, countData, createOne, getAndIncrementPrefix, getDataWithSorting, getFirstMatch, handleIncludeId, reqInfo, responseMessage, updateData } from "../../helper";
// import { applyDateFilter, checkBranch, checkCompany, checkIdExist, countData, createOne, getAndIncrementPrefix, getDataWithSorting, getFirstMatch, handleIncludeId, reqInfo, responseMessage, updateData } from "../../helper";
import { addSupplierBillSchema, deleteSupplierBillSchema, editSupplierBillSchema, getSupplierBillSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addSupplierBill = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addSupplierBillSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));

    // Validate supplier exists and verify billing address if provided
    const supplier = await getFirstMatch(contactModel, { _id: value?.supplierId, isDeleted: false }, {}, {});
    if (!supplier) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Supplier"), {}, {}));
    }

    if (value.billingAddress) {
      const isBillingValid = supplier?.address?.find((addr: any) => addr._id && addr._id.toString() === value.billingAddress.toString());
      if (!isBillingValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid Billing Address ID", {}, {}));
      }
    }

    // Validate purchase order if provided
    // if (value.purchaseOrderId && !(await checkIdExist(purchaseOrderModel, value.purchaseOrderId, "Purchase Order", res))) return;

    if (value?.termsAndConditionIds) {
      for (const item of value?.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, item, "terms And Condition ", res))) return;
      }
    }

    // Validate products exist if provided
    if (value?.productDetails && value?.productDetails?.length > 0) {
      for (const item of value?.productDetails) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value?.returnProductDetails?.item && value?.returnProductDetails?.item?.length > 0) {
      for (const item of value.returnProductDetails?.item) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value?.additionalCharges && value.additionalCharges?.length > 0) {
      for (const item of value.additionalCharges) {
        if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
      }
    }

    // Generate bill number if not provided using dynamic prefix helper
    if (!value?.supplierBillNo) {
      value.supplierBillNo = await getAndIncrementPrefix({
        branchId: value.branchId,
        companyId: value.companyId,
        prefixType: PREFIX_MODULES.SUPPLIER_BILL,
        model: supplierBillModel,
        fieldName: "supplierBillNo",
      });
    }
    if (!value?.referenceBillNo) {
      value.referenceBillNo = await getAndIncrementPrefix({
        branchId: value.branchId,
        companyId: value.companyId,
        prefixType: PREFIX_MODULES.SUPPLIER_BILL,
        model: supplierBillModel,
        fieldName: "referenceBillNo",
      });
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    // Set initial balance amount and status
    const totalAmount = value.summary?.netAmount || value.totalAmount || 0;
    value.balanceAmount = totalAmount;
    value.paymentStatus = SUPPLIER_PAYMENT_STATUS.UNPAID;

    const response = await createOne(supplierBillModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    // Direct Stock Update
    if (value?.productDetails && value.productDetails.length > 0) {
      for (const item of value.productDetails) {
        // Update/Create stock record
        const existingStock = await getFirstMatch(stockModel, { productId: item.productId, branchId: value.branchId, isDeleted: false }, {}, {});
        if (existingStock) {
          await updateData(stockModel, { _id: existingStock._id }, { $inc: { qty: item.qty }, purchasePrice: item.unitCost, mrp: item.mrp }, {});
        } else {
          await createOne(stockModel, {
            productId: item.productId,
            branchId: value.branchId,
            companyId: value.companyId,
            qty: item.qty,
            purchasePrice: item.unitCost,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
            createdBy: user?._id || null,
          });
        }
        // Update latest purchase price in product master
        await updateData(productModel, { _id: item.productId }, { purchasePrice: item.unitCost }, {});
      }
    }

    // Handle return items in bill (decrement stock)
    if (value?.returnProductDetails?.item && value.returnProductDetails.item.length > 0) {
      for (const item of value.returnProductDetails.item) {
        await updateData(stockModel, { productId: item.productId, branchId: value.branchId, isDeleted: false }, { $inc: { qty: -item.qty } }, {});
      }
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

    // Validate supplier if being changed or Validate addresses if provided
    let supplierForAddress = null;
    if (value?.supplierId && value?.supplierId !== isExist?.supplierId.toString()) {
      supplierForAddress = await getFirstMatch(contactModel, { _id: value.supplierId, isDeleted: false }, {}, {});
      if (!supplierForAddress) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Supplier"), {}, {}));
      }
    } else if (value.billingAddress) {
      supplierForAddress = await getFirstMatch(contactModel, { _id: isExist.supplierId, isDeleted: false }, {}, {});
      if (!supplierForAddress) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Supplier"), {}, {}));
      }
    }

    if (supplierForAddress) {
      if (value.billingAddress) {
        const isBillingValid = supplierForAddress?.address?.find((addr: any) => addr._id && addr._id.toString() === value.billingAddress.toString());
        if (!isBillingValid) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid Billing Address ID", {}, {}));
        }
      }
    }

    if (value?.termsAndConditionIds) {
      for (const item of value?.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, item, "terms And Condition ", res))) return;
      }
    }

    // Validate products if items are being updated
    if (value?.productDetails && value?.productDetails?.length > 0) {
      for (const item of value?.productDetails) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    if (value?.returnProductDetails?.item && value?.returnProductDetails?.item?.length > 0) {
      for (const item of value.returnProductDetails?.item) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      }
    }

    value.updatedBy = user?._id || null;

    // Recalculate balance and payment status if amounts are present
    const totalAmount = value.summary?.netAmount || value.totalAmount || isExist.summary?.netAmount || isExist.totalAmount || 0;
    const paidAmount = isExist.paidAmount || 0;
    value.balanceAmount = Math.max(0, totalAmount - paidAmount);

    if (value.balanceAmount <= 0) {
      value.paymentStatus = SUPPLIER_PAYMENT_STATUS.PAID;
    } else if (paidAmount > 0) {
      value.paymentStatus = SUPPLIER_PAYMENT_STATUS.PARTIAL;
    } else {
      value.paymentStatus = SUPPLIER_PAYMENT_STATUS.UNPAID;
    }

    const response = await updateData(supplierBillModel, { _id: value?.supplierBillId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Supplier Bill"), {}, {}));
    }

    // Direct Stock Update for Edit
    // 1. Revert Old Stock
    if (isExist.productDetails && isExist.productDetails.length > 0) {
      for (const item of isExist.productDetails) {
        await updateData(stockModel, { productId: item.productId, branchId: isExist.branchId, isDeleted: false }, { $inc: { qty: -item.qty } }, {});
      }
    }
    if (isExist.returnProductDetails?.item && isExist.returnProductDetails.item.length > 0) {
      for (const item of isExist.returnProductDetails.item) {
        await updateData(stockModel, { productId: item.productId, branchId: isExist.branchId, isDeleted: false }, { $inc: { qty: item.qty } }, {});
      }
    }

    // 2. Apply New Stock
    const branchId = value.branchId || isExist.branchId;
    const companyId = value.companyId || isExist.companyId;
    if (value.productDetails && value.productDetails.length > 0) {
      for (const item of value.productDetails) {
        const existingStock = await getFirstMatch(stockModel, { productId: item.productId, branchId: branchId, isDeleted: false }, {}, {});
        if (existingStock) {
          await updateData(stockModel, { _id: existingStock._id }, { $inc: { qty: item.qty }, purchasePrice: item.unitCost, mrp: item.mrp }, {});
        } else {
          await createOne(stockModel, {
            productId: item.productId,
            branchId: branchId,
            companyId: companyId,
            qty: item.qty,
            purchasePrice: item.unitCost,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
            createdBy: user?._id || null,
          });
        }
        await updateData(productModel, { _id: item.productId }, { purchasePrice: item.unitCost }, {});
      }
    }
    if (value.returnProductDetails?.item && value.returnProductDetails.item.length > 0) {
      for (const item of value.returnProductDetails.item) {
        await updateData(stockModel, { productId: item.productId, branchId: branchId, isDeleted: false }, { $inc: { qty: -item.qty } }, {});
      }
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

    const isExist = await getFirstMatch(supplierBillModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Supplier Bill"), {}, {}));
    }

    // Revert Stock before deletion
    if (isExist.productDetails && isExist.productDetails.length > 0) {
      for (const item of isExist.productDetails) {
        await updateData(stockModel, { productId: item.productId, branchId: isExist.branchId, isDeleted: false }, { $inc: { qty: -item.qty } }, {});
      }
    }
    if (isExist.returnProductDetails?.item && isExist.returnProductDetails.item.length > 0) {
      for (const item of isExist.returnProductDetails.item) {
        await updateData(stockModel, { productId: item.productId, branchId: isExist.branchId, isDeleted: false }, { $inc: { qty: item.qty } }, {});
      }
    }

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
    const branchId = user?.branchId?._id;
    let { page, limit, search, activeFilter, companyFilter, branchFilter, statusFilter, paymentStatus, startDate, endDate, supplierFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = new ObjectId(companyId);
    }

    if (companyFilter) {
      criteria.companyId = new ObjectId(companyFilter);
    }

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (branchFilter) {
      criteria.branchId = branchFilter;
    }

    if (supplierFilter) {
      criteria.supplierId = new ObjectId(supplierFilter);
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

    applyDateFilter(criteria, startDate as string, endDate as string, "supplierBillDate");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        {
          path: "supplierId",
          select: "firstName lastName companyName email phoneNo address contactType",
          populate: [
            { path: "address.country", select: "name" },
            { path: "address.state", select: "name" },
            { path: "address.city", select: "name" },
          ],
        },
        // { path: "purchaseOrderId", select: "orderNo" },
        {
          path: "productDetails.productId",
          select: "name itemCode purchasePrice",
        },
        {
          path: "returnProductDetails.item.productId",
          select: "name itemCode",
        },
        {
          path: "productDetails.uomId",
          select: "name",
        },
        {
          path: "productDetails.taxId",
          select: "name percentage",
        },
        {
          path: "returnProductDetails.item.uomId",
          select: "name",
        },
        {
          path: "returnProductDetails.item.taxId",
          select: "name percentage",
        },
        {
          path: "additionalCharges.taxId",
          select: "name percentage",
        },
        {
          path: "additionalCharges.chargeId",
          select: "name type",
        },
        { path: "termsAndConditionIds", select: "termsCondition" },
        { path: "paymentTermsId", select: "name day" },
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
        { path: "updatedBy", select: "name userType" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    let response = await getDataWithSorting(supplierBillModel, criteria, {}, options);

    // Manually extract billing address from the populated supplier object
    response = response.map((sb: any) => {
      let sbObj = sb.toObject ? sb.toObject() : sb;

      if (sbObj.supplierId && sbObj.supplierId.address) {
        const extractAddressFields = (addr: any) => ({
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          country: addr.country,
          state: addr.state,
          city: addr.city,
          pinCode: addr.pinCode,
          _id: addr._id,
        });

        // Trim all addresses in the supplier's address array
        sbObj.supplierId.address = sbObj.supplierId.address.map(extractAddressFields);

        if (sbObj.billingAddress) {
          const billingStr = sbObj.billingAddress.toString();
          const billingAddr = sbObj.supplierId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
          if (billingAddr) {
            sbObj.billingAddress = extractAddressFields(billingAddr);
          }
        }
      }
      sbObj.netAmount = sbObj.summary?.netAmount || sbObj.totalAmount || 0;
      return sbObj;
    });

    // Aggregation for summary statistics
    const statsCriteria: any = { isDeleted: false };
    if (criteria.companyId) {
      statsCriteria.companyId = criteria.companyId;
    }

    if (criteria.branchId) {
      statsCriteria.branchId = criteria.branchId;
    }

    const summaryResults = await supplierBillModel.aggregate([
      { $match: statsCriteria },
      {
        $group: {
          _id: null,
          totalPurchase: { $sum: "$summary.netAmount" },
          paidAmount: { $sum: "$paidAmount" },
          unpaidAmount: { $sum: "$balanceAmount" },
        },
      },
    ]);

    const summary = {
      totalPurchase: summaryResults[0]?.totalPurchase || 0,
      paidAmount: summaryResults[0]?.paidAmount || 0,
      unpaidAmount: summaryResults[0]?.unpaidAmount || 0,
    };

    const totalData = await countData(supplierBillModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Supplier Bill"), { supplierBill_data: response, totalData, summary, state }, {}));

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
          {
            path: "supplierId",
            select: "firstName lastName companyName email phoneNo address contactType",
            populate: [
              { path: "address.country", select: "name" },
              { path: "address.state", select: "name" },
              { path: "address.city", select: "name" },
            ],
          },
          {
            path: "productDetails.uomId",
            select: "name",
          },
          {
            path: "productDetails.taxId",
            select: "name percentage",
          },
          {
            path: "productDetails.productId",
            select: "name itemCode purchasePrice hsn gst",
          },
          {
            path: "returnProductDetails.item.productId",
            select: "name itemCode purchasePrice",
          },
          {
            path: "returnProductDetails.item.uomId",
            select: "name",
          },
          {
            path: "returnProductDetails.item.taxId",
            select: "name percentage",
          },
          { path: "additionalCharges.chargeId", select: "name type" },
          { path: "additionalCharges.taxId", select: "name percentage" },
          { path: "termsAndConditionIds", select: "termsCondition" },
          { path: "paymentTermsId", select: "name day" },
          { path: "companyId", select: "name gstNo" },
          { path: "branchId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
          { path: "updatedBy", select: "name userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Supplier Bill"), {}, {}));
    }

    let sbObj = response.toObject ? response.toObject() : response;

    if (sbObj.supplierId && sbObj.supplierId.address) {
      const extractAddressFields = (addr: any) => ({
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        country: addr.country,
        state: addr.state,
        city: addr.city,
        pinCode: addr.pinCode,
        _id: addr._id,
      });

      // Trim all addresses in the supplier's address array
      sbObj.supplierId.address = sbObj.supplierId.address.map(extractAddressFields);

      if (sbObj.billingAddress) {
        const billingStr = sbObj.billingAddress.toString();
        const billingAddr = sbObj.supplierId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
        if (billingAddr) {
          sbObj.billingAddress = extractAddressFields(billingAddr);
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Supplier Bill"), sbObj, {}));
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
    const branchId = user?.branchId?._id;
    const { supplierId, status, paymentStatus, search, companyFilter, branchFilter, includeId } = req.query; // Optional filters

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (branchFilter) {
      criteria.branchId = branchFilter;
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
      if (Array.isArray(paymentStatus)) {
        criteria.paymentStatus = { $in: paymentStatus };
      } else if (typeof paymentStatus === "string" && paymentStatus.includes(",")) {
        criteria.paymentStatus = { $in: paymentStatus.split(",") };
      } else {
        criteria.paymentStatus = paymentStatus;
      }
    }

    if (search) {
      criteria.$or = [{ supplierBillNo: { $regex: search, $options: "si" } }, { referenceBillNo: { $regex: search, $options: "si" } }];
    }

    criteria = handleIncludeId(criteria, includeId);

    const options: any = {
      sort: { supplierBillDate: -1 },
      limit: search ? 50 : 1000,
      populate: [
        { path: "supplierId", select: "firstName lastName companyName" },
        { path: "branchId", select: "name" },
      ],
    };

    const response = await getDataWithSorting(
      supplierBillModel,
      criteria,
      {
        supplierBillNo: 1,
        supplierBillDate: 1,
        "summary.netAmount": 1,
        totalAmount: 1,
        balanceAmount: 1,
        paymentStatus: 1,
        branchId: 1,
      },
      options,
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: `${item.supplierBillNo} (${item.balanceAmount})`,
      supplierBillNo: item.supplierBillNo,
      supplierBillDate: item.supplierBillDate,
      netAmount: item.summary?.netAmount || item.totalAmount || 0,
      balanceAmount: item.balanceAmount,
      paymentStatus: item.paymentStatus,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Supplier Bill Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};



