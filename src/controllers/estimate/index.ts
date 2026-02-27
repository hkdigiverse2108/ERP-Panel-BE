import { apiResponse, HTTP_STATUS } from "../../common";
import { contactModel, EstimateModel, productModel, taxModel, termsConditionModel, uomModel, additionalChargeModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter } from "../../helper";
import { generateSequenceNumber } from "../../helper/generateSequenceNumber";
import { addEstimateSchema, deleteEstimateSchema, editEstimateSchema, getEstimateSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addEstimate = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addEstimateSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate customer exists and verify billing/shipping addresses if provided
    const customer = await getFirstMatch(contactModel, { _id: value?.customerId, isDeleted: false }, {}, {});
    if (!customer) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Customer"), {}, {}));
    }

    if (value.billingAddress) {
      const isBillingValid = customer?.address?.find((addr: any) => addr._id && addr._id.toString() === value.billingAddress.toString());
      if (!isBillingValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid Billing Address ID", {}, {}));
      }
    }

    if (value.shippingAddress) {
      const isShippingValid = customer?.address?.find((addr: any) => addr._id && addr._id.toString() === value.shippingAddress.toString());
      if (!isShippingValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid Shipping Address ID", {}, {}));
      }
    }

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (item.uomId && !(await checkIdExist(uomModel, item.uomId, "UOM", res))) return;
      if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // Validate additional charge taxes exist
    if (value.additionalCharges) {
      for (const charge of value.additionalCharges) {
        if (charge.chargeId && !(await checkIdExist(additionalChargeModel, charge.chargeId, "Additional Charge", res))) return;
        if (charge.taxId && !(await checkIdExist(taxModel, charge.taxId, "Additional Charge Tax", res))) return;
      }
    }

    // Validate terms and conditions exist
    if (value.termsAndConditionIds && value.termsAndConditionIds.length > 0) {
      for (const tncId of value.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, tncId, "Terms and Condition", res))) return;
      }
    }

    // Generate document number if not provided
    if (!value.estimateNo) {
      value.estimateNo = await generateSequenceNumber({ model: EstimateModel, prefix: "EST", fieldName: "estimateNo", companyId: value.companyId });
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(EstimateModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Estimate"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editEstimate = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editEstimateSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(EstimateModel, { _id: value?.estimateId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Estimate"), {}, {}));
    }

    // Validate customer if being changed or Validate addresses if provided
    let customerForAddress = null;
    if (value.customerId && value.customerId !== isExist.customerId.toString()) {
      customerForAddress = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (!customerForAddress) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Customer"), {}, {}));
      }
    } else if (value.billingAddress || value.shippingAddress) {
      customerForAddress = await getFirstMatch(contactModel, { _id: isExist.customerId, isDeleted: false }, {}, {});
      if (!customerForAddress) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Customer"), {}, {}));
      }
    }

    if (customerForAddress) {
      if (value.billingAddress) {
        const isBillingValid = customerForAddress?.address?.find((addr: any) => addr._id && addr._id.toString() === value.billingAddress.toString());
        if (!isBillingValid) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid Billing Address ID", {}, {}));
        }
      }
      if (value.shippingAddress) {
        const isShippingValid = customerForAddress?.address?.find((addr: any) => addr._id && addr._id.toString() === value.shippingAddress.toString());
        if (!isShippingValid) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Invalid Shipping Address ID", {}, {}));
        }
      }
    }

    // Validate products if items are being updated
    if (value.items && value.items.length > 0) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (item.uomId && !(await checkIdExist(uomModel, item.uomId, "UOM", res))) return;
        if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      }
    }

    // Validate additional charge taxes exist
    if (value.additionalCharges && value.additionalCharges.length > 0) {
      for (const charge of value.additionalCharges) {
        if (charge.chargeId && !(await checkIdExist(additionalChargeModel, charge.chargeId, "Additional Charge", res))) return;
        if (charge.taxId && !(await checkIdExist(taxModel, charge.taxId, "Additional Charge Tax", res))) return;
      }
    }

    // Validate terms and conditions exist
    if (value.termsAndConditionIds && value.termsAndConditionIds.length > 0) {
      for (const tncId of value.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, tncId, "Terms and Condition", res))) return;
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(EstimateModel, { _id: value?.estimateId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Estimate"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Estimate"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteEstimate = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteEstimateSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(EstimateModel, value?.id, "Estimate", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(EstimateModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Estimate"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Estimate"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllEstimate = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, status, startDate, endDate, companyFilter } = req.query;

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
      criteria.$or = [{ estimateNo: { $regex: search, $options: "si" } }];
    }

    if (status) {
      criteria.status = status;
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "date");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "customerId", select: "firstName lastName companyName email phoneNo address" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
        { path: "termsAndConditionIds", select: "termsCondition " },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    let response = await getDataWithSorting(EstimateModel, criteria, {}, options);

    // Manually extract billing and shipping addresses from the populated customer object
    response = response.map((est: any) => {
      let estObj = est.toObject ? est.toObject() : est;

      if (estObj.customerId && estObj.customerId.address) {
        if (estObj.billingAddress) {
          const billingStr = estObj.billingAddress.toString();
          estObj.billingAddress = estObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr) || estObj.billingAddress;
        }
        if (estObj.shippingAddress) {
          const shippingStr = estObj.shippingAddress.toString();
          estObj.shippingAddress = estObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr) || estObj.shippingAddress;
        }

        // Optionally remove the full address array from customerId if it's too large to send
        // delete estObj.customerId.address; 
      }
      return estObj;
    });

    const totalData = await countData(EstimateModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Estimate"), { estimate_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneEstimate = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getEstimateSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      EstimateModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "customerId", select: "firstName lastName companyName email phoneNo address" },
          { path: "items.productId", select: "name itemCode sellingPrice mrp" },
          { path: "items.taxId", select: "name percentage type" },
          { path: "companyId", select: "name " },
          { path: "branchId", select: "name " },
          { path: "termsAndConditionIds", select: "termsCondition " },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Estimate"), {}, {}));
    }

    let estObj = response.toObject ? response.toObject() : response;

    if (estObj.customerId && estObj.customerId.address) {
      if (estObj.billingAddress) {
        const billingStr = estObj.billingAddress.toString();
        estObj.billingAddress = estObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr) || estObj.billingAddress;
      }
      if (estObj.shippingAddress) {
        const shippingStr = estObj.shippingAddress.toString();
        estObj.shippingAddress = estObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr) || estObj.shippingAddress;
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Estimate"), estObj, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getEstimateDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { search, customerId } = req.query;

    let criteria: any = { isDeleted: false, status: "pending" }; // Usually dropdowns only show pending estimates
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (customerId) {
      criteria.customerId = customerId;
    }

    if (search) {
      criteria.$or = [{ estimateNo: { $regex: search, $options: "si" } }];
    }

    const options = {
      sort: { createdAt: -1 },
      select: "estimateNo date netAmount transectionSummary status",
      populate: [
        { path: "customerId", select: "firstName lastName companyName" },
      ],
    };

    const response = await getDataWithSorting(EstimateModel, criteria, {}, options);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Estimate Dropdown"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
