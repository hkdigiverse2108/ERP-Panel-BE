import { apiResponse, HTTP_STATUS, PREFIX_MODULES } from "../../common";
import { contactModel, purchaseDebitNoteModel, productModel, termsConditionModel, additionalChargeModel, uomModel, taxModel, purchaseOrderModel } from "../../database";
import { applyDateFilter, checkBranch, checkCompany, checkIdExist, countData, createOne, getAndIncrementPrefix, getDataWithSorting, getFirstMatch, handleIncludeId, reqInfo, responseMessage, updateData } from "../../helper";
import { addPurchaseDebitNoteSchema, deletePurchaseDebitNoteSchema, editPurchaseDebitNoteSchema, getPurchaseDebitNoteSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addPurchaseDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addPurchaseDebitNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);

    if (!value.companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    }
    if (!value.branchId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));
    }

    // Validate supplier exists and verify billing/shipping addresses if provided
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

    if (value.shippingAddress) {
      const isShippingValid = supplier?.address?.find((addr: any) => addr._id && addr._id.toString() === value.shippingAddress.toString());
      if (!isShippingValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid Shipping Address ID", {}, {}));
      }
    }

    // Validate Purchase Order if provided
    if (value?.purchaseId && !(await checkIdExist(purchaseOrderModel, value?.purchaseId, "Purchase Order", res))) return;

    if (value?.termsAndConditionIds) {
      for (const item of value?.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, item, "Terms And Condition", res))) return;
      }
    }

    if (value.shippingDetails?.transporterId) {
      if (!(await checkIdExist(contactModel, value.shippingDetails.transporterId, "Transporter", res))) return;
    }

    // Validate items
    if (value?.productDetails && value?.productDetails?.length > 0) {
      for (const item of value?.productDetails) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (item?.uomId && !(await checkIdExist(uomModel, item?.uomId, "UOM", res))) return;
        if (item?.taxId && !(await checkIdExist(taxModel, item?.taxId, "Tax", res))) return;
      }
    }

    // Validate additional charges
    if (value?.additionalCharges && value?.additionalCharges?.length > 0) {
      for (const item of value.additionalCharges) {
        if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
        if (item?.taxId && !(await checkIdExist(taxModel, item?.taxId, "Tax", res))) return;
      }
    }

    if (!value?.debitNoteNo) {
      value.debitNoteNo = await getAndIncrementPrefix({
        branchId: value.branchId,
        companyId: value.companyId,
        prefixType: PREFIX_MODULES.PURCHASE_DEBIT_NOTE,
        model: purchaseDebitNoteModel,
        fieldName: "debitNoteNo",
      });
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(purchaseDebitNoteModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Purchase Debit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editPurchaseDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editPurchaseDebitNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(purchaseDebitNoteModel, { _id: value?.purchaseDebitNoteId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Purchase Debit Note"), {}, {}));
    }

    // Validate supplier if being changed or Validate addresses if provided
    let supplierForAddress = null;
    if (value.supplierId && value.supplierId !== isExist.supplierId.toString()) {
      supplierForAddress = await getFirstMatch(contactModel, { _id: value.supplierId, isDeleted: false }, {}, {});
      if (!supplierForAddress) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Supplier"), {}, {}));
      }
    } else if (value.billingAddress || value.shippingAddress) {
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
      if (value.shippingAddress) {
        const isShippingValid = supplierForAddress?.address?.find((addr: any) => addr._id && addr._id.toString() === value.shippingAddress.toString());
        if (!isShippingValid) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid Shipping Address ID", {}, {}));
        }
      }
    }

    if (value?.purchaseId && value?.purchaseId !== isExist?.purchaseId?.toString()) {
      if (!(await checkIdExist(purchaseOrderModel, value?.purchaseId, "Purchase Order", res))) return;
    }

    if (value?.termsAndConditionIds) {
      for (const item of value?.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, item, "Terms And Condition", res))) return;
      }
    }

    if (value.shippingDetails?.transporterId) {
      if (!(await checkIdExist(contactModel, value.shippingDetails.transporterId, "Transporter", res))) return;
    }

    // Validate items
    if (value?.productDetails && value?.productDetails?.length > 0) {
      for (const item of value?.productDetails) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (item?.uomId && !(await checkIdExist(uomModel, item?.uomId, "UOM", res))) return;
        if (item?.taxId && !(await checkIdExist(taxModel, item?.taxId, "Tax", res))) return;
      }
    }

    // Validate additional charges
    if (value?.additionalCharges && value?.additionalCharges?.length > 0) {
      for (const item of value.additionalCharges) {
        if (!(await checkIdExist(additionalChargeModel, item?.chargeId, "Additional Charge", res))) return;
        if (item?.taxId && !(await checkIdExist(taxModel, item?.taxId, "Tax", res))) return;
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(purchaseDebitNoteModel, { _id: value?.purchaseDebitNoteId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Purchase Debit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Purchase Debit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deletePurchaseDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deletePurchaseDebitNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(purchaseDebitNoteModel, value?.id, "Purchase Debit Note", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(purchaseDebitNoteModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Purchase Debit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Purchase Debit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllPurchaseDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    let { page, limit, search, activeFilter, companyFilter, branchFilter, statusFilter, startDate, endDate } = req.query;

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

    if (search) {
      criteria.$or = [{ debitNoteNo: { $regex: search, $options: "si" } }, { referenceBillNo: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter === "true";

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "debitNoteDate");

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
        { path: "purchaseId", select: "purchaseNo" },
        {
          path: "productDetails.productId",
          select: "name itemCode purchasePrice variants",
        },
        { path: "productDetails.uomId", select: "name" },
        { path: "productDetails.taxId", select: "name percentage" },
        { path: "additionalCharges.chargeId", select: "name type" },
        { path: "additionalCharges.taxId", select: "name percentage" },
        { path: "paymentTermsId", select: "name day" },
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    let response = await getDataWithSorting(purchaseDebitNoteModel, criteria, {}, options);

    // Manually extract billing and shipping addresses from the populated supplier object
    response = response.map((pdn: any) => {
      let pdnObj = pdn.toObject ? pdn.toObject() : pdn;

      if (pdnObj.supplierId && pdnObj.supplierId.address) {
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
        pdnObj.supplierId.address = pdnObj.supplierId.address.map(extractAddressFields);

        if (pdnObj.billingAddress) {
          const billingStr = pdnObj.billingAddress.toString();
          const billingAddr = pdnObj.supplierId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
          if (billingAddr) {
            pdnObj.billingAddress = extractAddressFields(billingAddr);
          }
        }
        if (pdnObj.shippingAddress) {
          const shippingStr = pdnObj.shippingAddress.toString();
          const shippingAddr = pdnObj.supplierId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
          if (shippingAddr) {
            pdnObj.shippingAddress = extractAddressFields(shippingAddr);
          }
        }
      }
      return pdnObj;
    });
    const totalData = await countData(purchaseDebitNoteModel, criteria);

    const totalAmountAggregation = await purchaseDebitNoteModel.aggregate([
      { $match: criteria },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$summary.netAmount" },
        },
      },
    ]);
    const totalAmount = totalAmountAggregation[0]?.totalAmount || 0;

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Purchase Debit Note"), { purchaseDebitNote_data: response, totalData, totalAmount, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOnePurchaseDebitNote = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getPurchaseDebitNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      purchaseDebitNoteModel,
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
          { path: "purchaseId", select: "purchaseNo" },
          {
            path: "productDetails.productId",
            select: "name itemCode purchasePrice hsn gst variants",
          },
          { path: "productDetails.uomId", select: "name" },
          { path: "productDetails.taxId", select: "name percentage" },
          { path: "additionalCharges.chargeId", select: "name type" },
          { path: "additionalCharges.taxId", select: "name percentage" },
          { path: "paymentTermsId", select: "name day" },
          { path: "companyId", select: "name gstNo" },
          { path: "branchId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Purchase Debit Note"), {}, {}));
    }

    let pdnObj = response.toObject ? response.toObject() : response;

    if (pdnObj.supplierId && pdnObj.supplierId.address) {
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
      pdnObj.supplierId.address = pdnObj.supplierId.address.map(extractAddressFields);

      if (pdnObj.billingAddress) {
        const billingStr = pdnObj.billingAddress.toString();
        const billingAddr = pdnObj.supplierId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
        if (billingAddr) {
          pdnObj.billingAddress = extractAddressFields(billingAddr);
        }
      }
      if (pdnObj.shippingAddress) {
        const shippingStr = pdnObj.shippingAddress.toString();
        const shippingAddr = pdnObj.supplierId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
        if (shippingAddr) {
          pdnObj.shippingAddress = extractAddressFields(shippingAddr);
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Purchase Debit Note"), pdnObj, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getPurchaseDebitNoteDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const { supplierFilter, search, companyFilter, branchFilter, statusFilter, includeId } = req.query;

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

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (branchFilter) {
      criteria.branchId = branchFilter;
    }

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    if (search) {
      criteria.$or = [{ debitNoteNo: { $regex: search, $options: "si" } }, { referenceBillNo: { $regex: search, $options: "si" } }];
    }

    criteria = handleIncludeId(criteria, includeId);

    const options: any = {
      sort: { debitNoteDate: -1 },
      limit: search ? 50 : 1000,
      populate: [
        { path: "supplierId", select: "firstName lastName companyName" },
        { path: "branchId", select: "name" },
      ],
    };

    const response = await getDataWithSorting(
      purchaseDebitNoteModel,
      criteria,
      {
        debitNoteNo: 1,
        debitNoteDate: 1,
        "summary.netAmount": 1,
      },
      options,
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.debitNoteNo,
      debitNoteNo: item.debitNoteNo,
      debitNoteDate: item.debitNoteDate,
      netAmount: item.summary?.netAmount || 0,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Purchase Debit Note Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};



