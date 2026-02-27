import { apiResponse, HTTP_STATUS } from "../../common";
import { contactModel, SalesOrderModel, productModel, taxModel, uomModel, termsConditionModel, additionalChargeModel, EstimateModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, generateSequenceNumber } from "../../helper";
import { addSalesOrderSchema, deleteSalesOrderSchema, editSalesOrderSchema, getSalesOrderSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

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
      if (item.refId && !(await checkIdExist(EstimateModel, item.refId, "Estimate Reference", res))) return;
    }

    // Validate salesman exists if provided
    if (value.salesManId && !(await checkIdExist(contactModel, value.salesManId, "Salesman", res))) return;

    // Validate estimate exists if provided
    if (value.selectedEstimateId && !(await checkIdExist(EstimateModel, value.selectedEstimateId, "Selected Estimate", res))) return;

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
    if (!value.salesOrderNo) {
      value.salesOrderNo = await generateSequenceNumber({ model: SalesOrderModel, prefix: "SO", fieldName: "salesOrderNo", companyId: value.companyId });
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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
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

    // Validate salesman exists if provided
    if (value.salesManId && !(await checkIdExist(contactModel, value.salesManId, "Salesman", res))) return;

    // Validate estimate exists if provided
    if (value.selectedEstimateId && !(await checkIdExist(EstimateModel, value.selectedEstimateId, "Selected Estimate", res))) return;

    // Validate products if items are being updated
    if (value.items && value.items.length > 0) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (item.uomId && !(await checkIdExist(uomModel, item.uomId, "UOM", res))) return;
        if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
        if (item.refId && !(await checkIdExist(EstimateModel, item.refId, "Estimate Reference", res))) return;
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
    let { page, limit, search, status, startDate, endDate, activeFilter, companyFilter } = req.query;

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
      criteria.$or = [{ salesOrderNo: { $regex: search, $options: "si" } }];
    }
    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (status) {
      criteria.status = status;
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "date");

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

    // Manually extract billing and shipping addresses from the populated customer object
    const finalResponse = response.map((so: any) => {
      let soObj = so.toObject ? so.toObject() : so;

      if (soObj.customerId && soObj.customerId.address) {
        if (soObj.billingAddress) {
          const billingStr = soObj.billingAddress.toString();
          soObj.billingAddress = soObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr) || soObj.billingAddress;
        }
        if (soObj.shippingAddress) {
          const shippingStr = soObj.shippingAddress.toString();
          soObj.shippingAddress = soObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr) || soObj.shippingAddress;
        }
      }
      return soObj;
    });

    const totalData = await countData(SalesOrderModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Order"), { salesOrder_data: finalResponse, totalData, state }, {}));
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

    let soObj = response.toObject ? response.toObject() : response;

    if (soObj.customerId && soObj.customerId.address) {
      if (soObj.billingAddress) {
        const billingStr = soObj.billingAddress.toString();
        soObj.billingAddress = soObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr) || soObj.billingAddress;
      }
      if (soObj.shippingAddress) {
        const shippingStr = soObj.shippingAddress.toString();
        soObj.shippingAddress = soObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr) || soObj.shippingAddress;
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Order"), soObj, {}));
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
    const { customerId, status, search, companyFilter } = req.query; // Optional filters

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }
    if (companyFilter) {
      criteria.companyId = companyFilter;
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
      criteria.$or = [{ salesOrderNo: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { createdAt: -1 },
      limit: search ? 50 : 1000,
      populate: [{ path: "customerId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(SalesOrderModel, criteria, { salesOrderNo: 1, date: 1, netAmount: 1, transectionSummary: 1 }, options);

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.salesOrderNo,
      salesOrderNo: item.salesOrderNo,
      date: item.date,
      netAmount: item.transectionSummary?.netAmount || 0,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Order Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
