import { apiResponse, DELIVERY_CHALLAN_STATUS, HTTP_STATUS, INVOICE_STATUS, SALES_ORDER_STATUS, PREFIX_MODULES } from "../../common";
import { contactModel, deliveryChallanModel, InvoiceModel, SalesOrderModel, productModel, taxModel, uomModel, termsConditionModel, additionalChargeModel } from "../../database";
import { checkBranch, checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, getAndIncrementPrefix } from "../../helper";
import { addDeliveryChallanSchema, deleteDeliveryChallanSchema, editDeliveryChallanSchema, getDeliveryChallanSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addDeliveryChallan = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addDeliveryChallanSchema.validate(req.body);

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

    // Validate sales orders if provided
    if (value.salesOrderIds && value.salesOrderIds.length > 0) {
      for (const soId of value.salesOrderIds) {
        if (!(await checkIdExist(SalesOrderModel, soId, "Sales Order", res))) return;
      }
    }

    // Validate invoices if provided
    if (value.invoiceIds && value.invoiceIds.length > 0) {
      for (const invId of value.invoiceIds) {
        if (!(await checkIdExist(InvoiceModel, invId, "Invoice", res))) return;
      }
    }

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (item.uomId && !(await checkIdExist(uomModel, item.uomId, "UOM", res))) return;
      if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      if (item.refId) {
        if (!value.createdFrom) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "createdFrom field is required when refId is provided", {}, {}));
        }
        const refModel = value.createdFrom === "invoice" ? InvoiceModel : SalesOrderModel;
        const refName = value.createdFrom === "invoice" ? "Invoice Reference" : "Sales Order Reference";
        if (!(await checkIdExist(refModel, item.refId, refName, res))) return;
      }
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
    if (!value.deliveryChallanNo) {
      value.deliveryChallanNo = await getAndIncrementPrefix({
        branchId: value.branchId,
        companyId: value.companyId,
        prefixType: PREFIX_MODULES.DELIVERY_CHALLAN,
        model: deliveryChallanModel,
        fieldName: "deliveryChallanNo",
      });
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(deliveryChallanModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    if (value.salesOrderIds && value.salesOrderIds.length > 0) {
      for (const soId of value.salesOrderIds) {
        await updateData(SalesOrderModel, { _id: new ObjectId(soId) }, { status: SALES_ORDER_STATUS.DELIVERY_CHALLAN_CREATED }, {});
      }
    }

    if (value.invoiceIds && value.invoiceIds.length > 0) {
      for (const invId of value.invoiceIds) {
        await updateData(InvoiceModel, { _id: new ObjectId(invId) }, { status: INVOICE_STATUS.DELIVERY_CHALLAN_CREATED }, {});
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Delivery Challan"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editDeliveryChallan = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editDeliveryChallanSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(deliveryChallanModel, { _id: value?.deliveryChallanId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Delivery Challan"), {}, {}));
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

    // Validate sales orders if being changed
    if (value.salesOrderIds && value.salesOrderIds.length > 0) {
      for (const soId of value.salesOrderIds) {
        if (!(await checkIdExist(SalesOrderModel, soId, "Sales Order", res))) return;
      }
    }

    // Validate invoices if being changed
    if (value.invoiceIds && value.invoiceIds.length > 0) {
      for (const invId of value.invoiceIds) {
        if (!(await checkIdExist(InvoiceModel, invId, "Invoice", res))) return;
      }
    }

    // Validate products if items are being updated
    if (value.items && value.items.length > 0) {
      const createdFrom = value.createdFrom || isExist.createdFrom;
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (item.uomId && !(await checkIdExist(uomModel, item.uomId, "UOM", res))) return;
        if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
        if (item.refId) {
          if (!createdFrom) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "createdFrom field is required when refId is provided", {}, {}));
          }
          const refModel = createdFrom === "invoice" ? InvoiceModel : SalesOrderModel;
          const refName = createdFrom === "invoice" ? "Invoice Reference" : "Sales Order Reference";
          if (!(await checkIdExist(refModel, item.refId, refName, res))) return;
        }
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

    const response = await updateData(deliveryChallanModel, { _id: value?.deliveryChallanId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Delivery Challan"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Delivery Challan"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteDeliveryChallan = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteDeliveryChallanSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(deliveryChallanModel, value?.id, "Delivery Challan", res))) return;

    const isExist = await getFirstMatch(deliveryChallanModel, { _id: value?.id, isDeleted: false }, {}, {});
    if (isExist?.status !== DELIVERY_CHALLAN_STATUS.DELIVERED) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Delivery Challan is not be deleted.", {}, {}));
    }

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(deliveryChallanModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Delivery Challan"), {}, {}));
    }

    if (isExist?.invoiceIds && isExist?.invoiceIds.length > 0) {
      for (const invId of isExist?.invoiceIds) {
        await updateData(InvoiceModel, { _id: new ObjectId(invId) }, { status: INVOICE_STATUS.INVOICED }, {});
      }
    }

    if (isExist?.salesOrderIds && isExist?.salesOrderIds.length > 0) {
      for (const soId of isExist?.salesOrderIds) {
        await updateData(SalesOrderModel, { _id: new ObjectId(soId) }, { status: SALES_ORDER_STATUS.PENDING }, {});
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Delivery Challan"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllDeliveryChallan = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    let { page, limit, search, statusFilter, startDate, endDate, activeFilter, companyFilter, branchFilter, customerFilter } = req.query;

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

    if (customerFilter) {
      criteria.customerId = new ObjectId(customerFilter);
    }

    if (search) {
      criteria.$or = [{ deliveryChallanNo: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (statusFilter) {
      criteria.status = statusFilter;
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
        { path: "paymentTermsId", select: "name day" },
        { path: "createdBy", select: "fullName userType" },
        { path: "salesOrderIds", select: "salesOrderNo" },
        { path: "invoiceIds", select: "invoiceNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(deliveryChallanModel, criteria, {}, options);

    // Manually extract billing and shipping addresses from the populated customer object
    const finalResponse = response.map((dc: any) => {
      let dcObj = dc.toObject ? dc.toObject() : dc;

      if (dcObj.customerId && dcObj.customerId.address) {
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
        dcObj.customerId.address = dcObj.customerId.address.map(extractAddressFields);

        if (dcObj.billingAddress) {
          const billingStr = dcObj.billingAddress.toString();
          const billingAddr = dcObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
          if (billingAddr) {
            dcObj.billingAddress = extractAddressFields(billingAddr);
          }
        }
        if (dcObj.shippingAddress) {
          const shippingStr = dcObj.shippingAddress.toString();
          const shippingAddr = dcObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
          if (shippingAddr) {
            dcObj.shippingAddress = extractAddressFields(shippingAddr);
          }
        }
      }
      return dcObj;
    });

    // Aggregation for summary statistics
    const statsCriteria: any = { isDeleted: false };
    if (criteria.companyId) {
      statsCriteria.companyId = criteria.companyId;
    }

    if (criteria.branchId) {
      statsCriteria.branchId = criteria.branchId;
    }

    const summaryResults = await deliveryChallanModel.aggregate([
      { $match: statsCriteria },
      {
        $facet: {
          allDeliveryChallans: [{ $count: "count" }],
          invoiceCreated: [{ $match: { status: DELIVERY_CHALLAN_STATUS.INVOICE_CREATED } }, { $count: "count" }],
          delivered: [{ $match: { status: DELIVERY_CHALLAN_STATUS.DELIVERED } }, { $count: "count" }],
          cancelled: [{ $match: { status: DELIVERY_CHALLAN_STATUS.CANCELLED } }, { $count: "count" }],
        },
      },
    ]);

    const summary = {
      allDeliveryChallans: summaryResults[0].allDeliveryChallans[0]?.count || 0,
      invoiceCreated: summaryResults[0].invoiceCreated[0]?.count || 0,
      delivered: summaryResults[0].delivered[0]?.count || 0,
      cancelled: summaryResults[0].cancelled[0]?.count || 0,
    };

    const totalData = await countData(deliveryChallanModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Delivery Challan"), { deliveryChallan_data: finalResponse, totalData, summary, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneDeliveryChallan = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getDeliveryChallanSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      deliveryChallanModel,
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
          { path: "paymentTermsId", select: "name day" },
          { path: "createdBy", select: "fullName userType" },
          { path: "salesOrderIds", select: "salesOrderNo date" },
          { path: "invoiceIds", select: "invoiceNo date" },
          { path: "items.productId", select: "name itemCode sellingPrice mrp" },
          { path: "items.taxId", select: "name percentage type" },
          { path: "companyId", select: "name " },
          { path: "branchId", select: "name " },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Delivery Challan"), {}, {}));
    }

    let dcObj = response.toObject ? response.toObject() : response;

    if (dcObj.customerId && dcObj.customerId.address) {
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
      dcObj.customerId.address = dcObj.customerId.address.map(extractAddressFields);

      if (dcObj.billingAddress) {
        const billingStr = dcObj.billingAddress.toString();
        const billingAddr = dcObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
        if (billingAddr) {
          dcObj.billingAddress = extractAddressFields(billingAddr);
        }
      }
      if (dcObj.shippingAddress) {
        const shippingStr = dcObj.shippingAddress.toString();
        const shippingAddr = dcObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
        if (shippingAddr) {
          dcObj.shippingAddress = extractAddressFields(shippingAddr);
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Delivery Challan"), dcObj, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Delivery Challan Dropdown API
export const getDeliveryChallanDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    let { customerFilter, statusFilter, search, companyFilter, branchFilter } = req.query;

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

    if (customerFilter) {
      criteria.customerId = customerFilter;
    }

    if (statusFilter) {
      criteria.status = statusFilter;
    } else {
      criteria.status = DELIVERY_CHALLAN_STATUS.DELIVERED;
    }

    if (search) {
      criteria.$or = [{ deliveryChallanNo: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { createdAt: -1 },
      limit: search ? 50 : 1000,
      populate: [
        { path: "customerId", select: "firstName lastName companyName" },
        { path: "createdBy", select: "name userType" },
        { path: "branchId", select: "name" },
      ],
    };

    const response = await getDataWithSorting(deliveryChallanModel, criteria, { deliveryChallanNo: 1, date: 1, transactionSummary: 1, branchId: 1 }, options);

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.deliveryChallanNo,
      deliveryChallanNo: item.deliveryChallanNo,
      branchId: item.branchId,
      date: item.date,
      netAmount: item.transactionSummary?.netAmount || 0,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Delivery Challan Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
