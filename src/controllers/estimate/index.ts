import { apiResponse, HTTP_STATUS, ESTIMATE_STATUS, PREFIX_MODULES } from "../../common";
import { contactModel, EstimateModel, productModel, taxModel, termsConditionModel, uomModel, additionalChargeModel } from "../../database";
import { checkBranch, checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, getAndIncrementPrefix } from "../../helper";
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
    value.branchId = await checkBranch(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));

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

    // Validate transporter if provided
    if (value.shippingDetails && value.shippingDetails.transporterId) {
      if (!(await checkIdExist(contactModel, value.shippingDetails.transporterId, "Transporter", res))) return;
    }

    // Generate document number if not provided
    if (!value.estimateNo) {
      value.estimateNo = await getAndIncrementPrefix({
        branchId: value.branchId,
        companyId: value.companyId,
        prefixType: PREFIX_MODULES.ESTIMATE,
        model: EstimateModel,
        fieldName: "estimateNo",
      });
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

    // Validate transporter if provided
    if (value.shippingDetails && value.shippingDetails.transporterId) {
      if (!(await checkIdExist(contactModel, value.shippingDetails.transporterId, "Transporter", res))) return;
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

    const isExist = await getFirstMatch(EstimateModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (isExist.status !== "pending") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Estimate is not in pending state", {}, {}));
    }

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
    const branchId = user?.branchId?._id;
    let { page, limit, search, startDate, endDate, companyFilter, activeFilter, customerFilter, statusFilter, branchFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = new ObjectId(companyId);
    }

    if (activeFilter) {
      criteria.isActive = activeFilter;
    }

    if (companyFilter) {
      criteria.companyId = new ObjectId(companyFilter);
    }

    if (branchId) {
      criteria.branchId = new ObjectId(branchId);
    }

    if (branchFilter) {
      criteria.branchId = new ObjectId(branchFilter);
    }

    if (customerFilter) {
      criteria.customerId = new ObjectId(customerFilter);
    }

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    if (search) {
      criteria.$or = [{ estimateNo: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "date");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        {
          path: "customerId",
          select: "firstName lastName companyName email phoneNo address",
          populate: [
            { path: "address.country", select: "name" },
            { path: "address.state", select: "name" },
            { path: "address.city", select: "name" },
          ],
        },
        { path: "createdBy", select: "fullName userType" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "items.uomId", select: "name" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
        { path: "paymentTermsId", select: "name day" },
        { path: "termsAndConditionIds", select: "termsCondition " },
        { path: "additionalCharges.chargeId", select: "name type" },
        { path: "additionalCharges.taxId", select: "name percentage" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    let response = await getDataWithSorting(EstimateModel, criteria, {}, options);

    // Manually extract billing and shipping addresses from the populated customer object
    response = response.map((est: any) => {
      let estObj = est.toObject ? est.toObject() : est;

      if (estObj.customerId && estObj.customerId.address) {
        const extractAddressFields = (addr: any) => ({
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          country: addr.country,
          state: addr.state,
          city: addr.city,
          pinCode: addr.pinCode,
          _id: addr._id,
        });

        // Trim all addresses in the customer's address array
        estObj.customerId.address = estObj.customerId.address.map(extractAddressFields);

        if (estObj.billingAddress) {
          const billingStr = estObj.billingAddress.toString();
          const billingAddr = estObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
          if (billingAddr) {
            estObj.billingAddress = extractAddressFields(billingAddr);
          }
        }
        if (estObj.shippingAddress) {
          const shippingStr = estObj.shippingAddress.toString();
          const shippingAddr = estObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
          if (shippingAddr) {
            estObj.shippingAddress = extractAddressFields(shippingAddr);
          }
        }
      }
      return estObj;
    });

    // Aggregation for summary statistics
    const statsCriteria: any = { isDeleted: false };
    if (criteria.companyId) {
      statsCriteria.companyId = criteria.companyId;
    }

    if (criteria.branchId) {
      statsCriteria.branchId = criteria.branchId;
    }
    const summaryResults = await EstimateModel.aggregate([
      { $match: statsCriteria },
      {
        $facet: {
          allEstimates: [{ $count: "count" }],
          pending: [{ $match: { status: ESTIMATE_STATUS.PENDING } }, { $count: "count" }],
          orderCreated: [{ $match: { status: ESTIMATE_STATUS.ORDER_CREATED } }, { $count: "count" }],
          invoiceCreated: [{ $match: { status: ESTIMATE_STATUS.INVOICE_CREATED } }, { $count: "count" }],
        },
      },
    ]);

    const summary = {
      allEstimates: summaryResults[0].allEstimates[0]?.count || 0,
      pending: summaryResults[0].pending[0]?.count || 0,
      orderCreated: summaryResults[0].orderCreated[0]?.count || 0,
      invoiceCreated: summaryResults[0].invoiceCreated[0]?.count || 0,
    };

    const totalData = await countData(EstimateModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Estimate"), { estimate_data: response, totalData, summary, state }, {}));
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
          {
            path: "customerId",
            select: "firstName lastName companyName email phoneNo address",
            populate: [
              { path: "address.country", select: "name" },
              { path: "address.state", select: "name" },
              { path: "address.city", select: "name" },
            ],
          },
          { path: "createdBy", select: "fullName userType" },
          { path: "items.productId", select: "name itemCode sellingPrice mrp" },
          { path: "items.taxId", select: "name percentage" },
          { path: "items.uomId", select: "name" },
          { path: "companyId", select: "name " },
          { path: "branchId", select: "name " },
          { path: "paymentTermsId", select: "name day" },
          { path: "termsAndConditionIds", select: "termsCondition " },
          { path: "additionalCharges.chargeId", select: "name type" },
          { path: "additionalCharges.taxId", select: "name percentage" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Estimate"), {}, {}));
    }

    let estObj = response.toObject ? response.toObject() : response;

    if (estObj.customerId && estObj.customerId.address) {
      const extractAddressFields = (addr: any) => ({
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        country: addr.country,
        state: addr.state,
        city: addr.city,
        pinCode: addr.pinCode,
        _id: addr._id,
      });

      // Trim all addresses in the customer's address array
      estObj.customerId.address = estObj.customerId.address.map(extractAddressFields);

      if (estObj.billingAddress) {
        const billingStr = estObj.billingAddress.toString();
        const billingAddr = estObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
        if (billingAddr) {
          estObj.billingAddress = extractAddressFields(billingAddr);
        }
      }
      if (estObj.shippingAddress) {
        const shippingStr = estObj.shippingAddress.toString();
        const shippingAddr = estObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
        if (shippingAddr) {
          estObj.shippingAddress = extractAddressFields(shippingAddr);
        }
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
    const branchId = user?.branchId?._id;
    let { search, customerId, branchFilter, companyFilter, includeId } = req.query;

    let criteria: any = { isDeleted: false, status: "pending" }; // Usually dropdowns only show pending estimates
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

    if (customerId) {
      criteria.customerId = customerId;
    }

    if (search) {
      criteria.$or = [{ estimateNo: { $regex: search, $options: "si" } }];
    }

    if (includeId) {
      criteria = {
        $or: [criteria, { _id: new ObjectId(includeId as string) }],
      };
    }

    const options = {
      sort: { createdAt: -1 },
      select: "estimateNo date netAmount transactionSummary status",
      populate: [{ path: "customerId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(EstimateModel, criteria, {}, options);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Estimate Dropdown"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
