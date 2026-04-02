import { apiResponse, ESTIMATE_STATUS, HTTP_STATUS, SALES_ORDER_STATUS, PREFIX_MODULES } from "../../common";
import { contactModel, SalesOrderModel, productModel, taxModel, uomModel, termsConditionModel, additionalChargeModel, EstimateModel, userModel } from "../../database";
import { checkBranch, checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, generateSequenceNumber, getAndIncrementPrefix } from "../../helper";
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
      if (item.refId && !(await checkIdExist(EstimateModel, item.refId, "Estimate Reference", res))) return;
    }

    // Validate salesman exists if provided
    if (value.salesManId && !(await checkIdExist(userModel, value.salesManId, "Salesman", res))) return;

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

    // Generate document number if not provided using dynamic prefix helper
    if (!value.salesOrderNo) {
      value.salesOrderNo = await getAndIncrementPrefix({
        branchId: value.branchId,
        prefixType: PREFIX_MODULES.SALES_ORDER,
        model: SalesOrderModel,
        fieldName: "salesOrderNo",
      });
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(SalesOrderModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    // Update the estimate status if sales order is created from an estimate
    if (value.selectedEstimateId) {
      await updateData(EstimateModel, { _id: value.selectedEstimateId }, { status: ESTIMATE_STATUS.ORDER_CREATED }, {});
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
    if (value.salesManId && !(await checkIdExist(userModel, value.salesManId, "Salesman", res))) return;

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

    const isExist = await getFirstMatch(SalesOrderModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (isExist.status !== "pending") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Sales Order is not in pending state", {}, {}));
    }

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(SalesOrderModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Sales Order"), {}, {}));
    }

    // Revert estimate status if this sales order was created from an estimate
    if (response.selectedEstimateId) {
      await updateData(EstimateModel, { _id: response.selectedEstimateId }, { status: ESTIMATE_STATUS.PENDING }, {});
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
    let { page, limit, search, statusFilter, startDate, endDate, activeFilter, companyFilter, customerFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = new ObjectId(companyId);
    }
    if (companyFilter) {
      criteria.companyId = new ObjectId(companyFilter);
    }

    if (search) {
      criteria.$or = [{ salesOrderNo: { $regex: search, $options: "si" } }];
    }
    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    if (customerFilter) {
      criteria.customerId = new ObjectId(customerFilter);
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
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "items.uomId", select: "name" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
        { path: "selectedEstimateId", select: "estimateNo" },
        { path: "additionalCharges.chargeId", select: "name" },
        { path: "additionalCharges.taxId", select: "name percentage" },
        { path: "termsAndConditionIds", select: "name" },
        { path: "paymentTermsId", select: "name day" },
        { path: "shippingDetails.transporterId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(SalesOrderModel, criteria, {}, options);

    // Manually extract billing and shipping addresses from the populated customer object
    const finalResponse = response.map((so: any) => {
      let soObj = so.toObject ? so.toObject() : so;

      if (soObj.customerId && soObj.customerId.address) {
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
        soObj.customerId.address = soObj.customerId.address.map(extractAddressFields);

        if (soObj.billingAddress) {
          const billingStr = soObj.billingAddress.toString();
          const billingAddr = soObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
          if (billingAddr) {
            soObj.billingAddress = extractAddressFields(billingAddr);
          }
        }
        if (soObj.shippingAddress) {
          const shippingStr = soObj.shippingAddress.toString();
          const shippingAddr = soObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
          if (shippingAddr) {
            soObj.shippingAddress = extractAddressFields(shippingAddr);
          }
        }
      }
      return soObj;
    });

    // Aggregation for summary statistics
    const statsCriteria: any = { isDeleted: false };
    if (criteria.companyId) {
      statsCriteria.companyId = criteria.companyId;
    }

    const summaryResults = await SalesOrderModel.aggregate([
      { $match: statsCriteria },
      {
        $facet: {
          allSalesOrders: [{ $count: "count" }],
          pending: [{ $match: { status: SALES_ORDER_STATUS.PENDING } }, { $count: "count" }],
          invoiceCreated: [{ $match: { status: SALES_ORDER_STATUS.INVOICE_CREATED } }, { $count: "count" }],
          deliveryChallanCreated: [{ $match: { status: SALES_ORDER_STATUS.DELIVERY_CHALLAN_CREATED } }, { $count: "count" }],
          cancelled: [{ $match: { status: SALES_ORDER_STATUS.CANCELLED } }, { $count: "count" }],
        },
      },
    ]);

    const summary = {
      allSalesOrders: summaryResults[0].allSalesOrders[0]?.count || 0,
      pending: summaryResults[0].pending[0]?.count || 0,
      invoiceCreated: summaryResults[0].invoiceCreated[0]?.count || 0,
      deliveryChallanCreated: summaryResults[0].deliveryChallanCreated[0]?.count || 0,
      cancelled: summaryResults[0].cancelled[0]?.count || 0,
    };

    const totalData = await countData(SalesOrderModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Order"), { salesOrder_data: finalResponse, totalData, summary, state }, {}));

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
          {
            path: "customerId",
            select: "firstName lastName companyName email phoneNo address",
            populate: [
              { path: "address.country", select: "name" },
              { path: "address.state", select: "name" },
              { path: "address.city", select: "name" },
            ],
          },
          { path: "items.productId", select: "name itemCode sellingPrice mrp" },
          { path: "items.taxId", select: "name percentage type" },
          { path: "companyId", select: "name " },
          { path: "branchId", select: "name " },
          { path: "paymentTermsId", select: "name day" },
          { path: "createdBy", select: "fullName userType" },
          { path: "updatedBy", select: "name userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Sales Order"), {}, {}));
    }

    let soObj = response.toObject ? response.toObject() : response;

    if (soObj.customerId && soObj.customerId.address) {
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
      soObj.customerId.address = soObj.customerId.address.map(extractAddressFields);

      if (soObj.billingAddress) {
        const billingStr = soObj.billingAddress.toString();
        const billingAddr = soObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
        if (billingAddr) {
          soObj.billingAddress = extractAddressFields(billingAddr);
        }
      }
      if (soObj.shippingAddress) {
        const shippingStr = soObj.shippingAddress.toString();
        const shippingAddr = soObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
        if (shippingAddr) {
          soObj.shippingAddress = extractAddressFields(shippingAddr);
        }
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
    const { customerId, statusFilter, search, companyFilter } = req.query; // Optional filters

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

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    if (search) {
      criteria.$or = [{ salesOrderNo: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { createdAt: -1 },
      limit: search ? 50 : 1000,
      populate: [{ path: "customerId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(SalesOrderModel, criteria, { salesOrderNo: 1, date: 1, netAmount: 1, transactionSummary: 1 }, options);

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.salesOrderNo,
      salesOrderNo: item.salesOrderNo,
      date: item.date,
      netAmount: item.transactionSummary?.netAmount || 0,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Order Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
