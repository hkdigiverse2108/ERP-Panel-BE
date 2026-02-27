import { apiResponse, HTTP_STATUS, SALES_ORDER_STATUS, ESTIMATE_STATUS } from "../../common";
import { contactModel, InvoiceModel, SalesOrderModel, EstimateModel, productModel, taxModel, userModel, accountGroupModel, termsConditionModel, deliveryChallanModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, generateSequenceNumber } from "../../helper";
import { addInvoiceSchema, deleteInvoiceSchema, editInvoiceSchema, getInvoiceSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;


export const addInvoice = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addInvoiceSchema.validate(req.body);

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

    // Validate sales orders if provided
    if (value.salesOrderIds && value.salesOrderIds.length > 0) {
      for (const soId of value.salesOrderIds) {
        if (!(await checkIdExist(SalesOrderModel, soId, "Sales Order", res))) return;
      }
    }

    // Validate delivery challans if provided
    if (value.deliveryChallanIds && value.deliveryChallanIds.length > 0) {
      for (const dcId of value.deliveryChallanIds) {
        if (!(await checkIdExist(deliveryChallanModel, dcId, "Delivery Challan", res))) return;
      }
    }

    // Validate sales man if provided
    if (value.salesManId && !(await checkIdExist(userModel, value.salesManId, "Sales Man", res))) return;

    // Validate account ledger if provided
    if (value.accountLedgerId && !(await checkIdExist(accountGroupModel, value.accountLedgerId, "Account Ledger", res))) return;

    // Validate terms and conditions exist
    if (value.termsAndConditionIds && value.termsAndConditionIds.length > 0) {
      for (const tncId of value.termsAndConditionIds) {
        if (!(await checkIdExist(termsConditionModel, tncId, "Terms and Condition", res))) return;
      }
    }

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      if (item.refId) {
        if (!value.createdFrom) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "createdFrom field is required when refId is provided", {}, {}));
        }
        const refModel = value.createdFrom === "delivery-challan" ? deliveryChallanModel : SalesOrderModel;
        const refName = value.createdFrom === "delivery-challan" ? "Delivery Challan Reference" : "Sales Order Reference";
        if (!(await checkIdExist(refModel, item.refId, refName, res))) return;
      }
    }

    // Generate document number if not provided
    if (!value.invoiceNo) {
      value.invoiceNo = await generateSequenceNumber({ model: InvoiceModel, prefix: "INV", fieldName: "invoiceNo", companyId: value.companyId });
    }

    // Get customer name
    if (customer) {
      value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
    }

    // Calculate totals if not provided
    if (!value.transectionSummary) {
      value.transectionSummary = {};
    }
    if (value.transectionSummary.grossAmount === undefined) {
      value.transectionSummary.grossAmount = value.items.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
    }
    if (value.transectionSummary.netAmount === undefined || value.transectionSummary.netAmount === null) {
      value.transectionSummary.netAmount = (value.transectionSummary.grossAmount || 0) - (value.transectionSummary.discountAmount || 0) + (value.transectionSummary.taxAmount || 0) + (value.transectionSummary.roundOff || 0);
    }

    // Calculate balance amount
    value.balanceAmount = (value.transectionSummary.netAmount || 0) - (value.paidAmount || 0);

    // Set payment status based on paid amount
    if (!value.paymentStatus) {
      if (value.paidAmount === 0) {
        value.paymentStatus = "unpaid";
      } else if (value.paidAmount >= value.transectionSummary.netAmount) {
        value.paymentStatus = "paid";
      } else {
        value.paymentStatus = "partial";
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(InvoiceModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    // Update the sales order status and cascade to estimate if applicable
    if (value.salesOrderIds && value.salesOrderIds.length > 0) {
      for (const soId of value.salesOrderIds) {
        const so = await getFirstMatch(SalesOrderModel, { _id: soId, isDeleted: false }, {}, {});
        if (so) {
          await updateData(SalesOrderModel, { _id: soId }, { status: SALES_ORDER_STATUS.INVOICE_CREATED }, {});

          // If the sales order was created from an estimate, update the estimate status too
          if (so.selectedEstimateId) {
            await updateData(EstimateModel, { _id: so.selectedEstimateId }, { status: ESTIMATE_STATUS.INVOICE_CREATED }, {});
          }
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Invoice"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editInvoice = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editInvoiceSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(InvoiceModel, { _id: value?.invoiceId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Invoice"), {}, {}));
    }

    // Validate customer if being changed or Validate addresses if provided
    let customerForAddress = null;
    if (value.customerId && value.customerId !== isExist.customerId.toString()) {
      if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
      customerForAddress = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customerForAddress) {
        value.customerName = customerForAddress.companyName || `${customerForAddress.firstName} ${customerForAddress.lastName || ""}`.trim();
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

    // Validate delivery challans if being changed
    if (value.deliveryChallanIds && value.deliveryChallanIds.length > 0) {
      for (const dcId of value.deliveryChallanIds) {
        if (!(await checkIdExist(deliveryChallanModel, dcId, "Delivery Challan", res))) return;
      }
    }

    // Validate sales man if being changed
    if (value.salesManId && value.salesManId !== isExist.salesManId?.toString()) {
      if (!(await checkIdExist(userModel, value.salesManId, "Sales Man", res))) return;
    }

    // Validate account ledger if provided
    if (value.accountLedgerId && value.accountLedgerId !== isExist.accountLedgerId?.toString()) {
      if (!(await checkIdExist(accountGroupModel, value.accountLedgerId, "Account Ledger", res))) return;
    }

    // Validate terms and conditions exist
    if (value.termsAndConditionIds && value.termsAndConditionIds.length > 0) {
      const existingTncIds = isExist.termsAndConditionIds?.map(id => id.toString()) || [];
      for (const tncId of value.termsAndConditionIds) {
        if (!existingTncIds.includes(tncId.toString())) {
          if (!(await checkIdExist(termsConditionModel, tncId, "Terms and Condition", res))) return;
        }
      }
    }

    // Validate products if items are being updated
    if (value.items && value.items.length > 0) {
      const createdFrom = value.createdFrom || isExist.createdFrom;
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
        if (item.refId) {
          if (!createdFrom) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "createdFrom field is required when refId is provided", {}, {}));
          }
          const refModel = createdFrom === "delivery-challan" ? deliveryChallanModel : SalesOrderModel;
          const refName = createdFrom === "delivery-challan" ? "Delivery Challan Reference" : "Sales Order Reference";
          if (!(await checkIdExist(refModel, item.refId, refName, res))) return;
        }
      }

      // Recalculate totals
      if (!value.transectionSummary) {
        value.transectionSummary = isExist.transectionSummary || {};
      }
      value.transectionSummary.grossAmount = value.items.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
      value.transectionSummary.netAmount = (value.transectionSummary.grossAmount || 0) - (value.transectionSummary.discountAmount || 0) + (value.transectionSummary.taxAmount || 0) + (value.transectionSummary.roundOff || 0);
    }

    // Recalculate balance and payment status
    const reqNetAmount = value.transectionSummary?.netAmount ?? isExist.transectionSummary?.netAmount ?? 0;
    value.balanceAmount = reqNetAmount - (value.paidAmount !== undefined ? value.paidAmount : isExist.paidAmount);
    if (value.paidAmount !== undefined) {
      const paidAmt = value.paidAmount;
      if (paidAmt === 0) {
        value.paymentStatus = "unpaid";
      } else if (paidAmt >= reqNetAmount) {
        value.paymentStatus = "paid";
      } else {
        value.paymentStatus = "partial";
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(InvoiceModel, { _id: value?.invoiceId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Invoice"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Invoice"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteInvoice = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteInvoiceSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const invoice = await getFirstMatch(InvoiceModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!invoice) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Invoice"), {}, {}));
    }

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(InvoiceModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Invoice"), {}, {}));
    }

    // Revert sales order and estimate statuses
    if (invoice.salesOrderIds && invoice.salesOrderIds.length > 0) {
      for (const soId of invoice.salesOrderIds) {
        const so = await getFirstMatch(SalesOrderModel, { _id: soId, isDeleted: false }, {}, {});
        if (so) {
          await updateData(SalesOrderModel, { _id: soId }, { status: SALES_ORDER_STATUS.PENDING }, {});

          if (so.selectedEstimateId) {
            await updateData(EstimateModel, { _id: so.selectedEstimateId }, { status: ESTIMATE_STATUS.ORDER_CREATED }, {});
          }
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Invoice"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllInvoice = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, activeFilter, companyFilter, status, paymentStatus, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ invoiceNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }];
    }

    if (status) {
      criteria.status = status;
    }

    if (paymentStatus) {
      criteria.paymentStatus = paymentStatus;
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "date");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "customerId", select: "firstName lastName companyName email phoneNo" },
        { path: "salesOrderIds", select: "salesOrderNo" },
        { path: "deliveryChallanIds", select: "deliveryChallanNo" },
        { path: "salesManId", select: "firstName lastName" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(InvoiceModel, criteria, {}, options);

    // Manually extract billing and shipping addresses from the populated customer object
    const finalResponse = response.map((inv: any) => {
      let invObj = inv.toObject ? inv.toObject() : inv;

      if (invObj.customerId && invObj.customerId.address) {
        if (invObj.billingAddress) {
          const billingStr = invObj.billingAddress.toString();
          invObj.billingAddress = invObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr) || invObj.billingAddress;
        }
        if (invObj.shippingAddress) {
          const shippingStr = invObj.shippingAddress.toString();
          invObj.shippingAddress = invObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr) || invObj.shippingAddress;
        }
      }
      return invObj;
    });

    const totalData = await countData(InvoiceModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Invoice"), { invoice_data: finalResponse, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneInvoice = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getInvoiceSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      InvoiceModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "customerId", select: "firstName lastName companyName email phoneNo address" },
          { path: "salesOrderIds", select: "salesOrderNo date netAmount" },
          { path: "deliveryChallanIds", select: "deliveryChallanNo date netAmount" },
          { path: "salesManId", select: "firstName lastName" },
          { path: "items.productId", select: "name itemCode sellingPrice mrp" },
          { path: "items.taxId", select: "name percentage type" },
          { path: "companyId", select: "name " },
          { path: "branchId", select: "name " },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Invoice"), {}, {}));
    }

    let invObj = response.toObject ? response.toObject() : response;

    if (invObj.customerId && invObj.customerId.address) {
      if (invObj.billingAddress) {
        const billingStr = invObj.billingAddress.toString();
        invObj.billingAddress = invObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr) || invObj.billingAddress;
      }
      if (invObj.shippingAddress) {
        const shippingStr = invObj.shippingAddress.toString();
        invObj.shippingAddress = invObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr) || invObj.shippingAddress;
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Invoice"), invObj, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Invoice Dropdown API
export const getInvoiceDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { customerId, status, paymentStatus, search } = req.query; // Optional filters

    let criteria: any = { isDeleted: false, isActive: true };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (customerId) {
      criteria.customerId = customerId;
    }

    if (status) {
      criteria.status = status;
    } else {
      // Default: only show active invoices
      criteria.status = "active";
    }

    if (paymentStatus) {
      criteria.paymentStatus = paymentStatus;
    }

    if (search) {
      criteria.$or = [{ invoiceNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { createdAt: -1 },
      limit: search ? 50 : 1000,
      populate: [{ path: "customerId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(InvoiceModel, criteria, { invoiceNo: 1, customerName: 1, date: 1, transectionSummary: 1, balanceAmount: 1 }, options);

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.invoiceNo,
      invoiceNo: item.invoiceNo,
      customerName: item.customerName,
      date: item.date,
      netAmount: item.transectionSummary?.netAmount || 0,
      balanceAmount: item.balanceAmount,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Invoice Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
