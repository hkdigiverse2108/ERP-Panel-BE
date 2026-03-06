import { apiResponse, HTTP_STATUS } from "../../common";
import { contactModel, salesCreditNoteModel, productModel, termsConditionModel, additionalChargeModel, uomModel, taxModel, accountGroupModel, employeeModel, SalesOrderModel, InvoiceModel, userModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, generateSequenceNumber, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter } from "../../helper";
import { addSalesCreditNoteSchema, deleteSalesCreditNoteSchema, editSalesCreditNoteSchema, getSalesCreditNoteSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addSalesCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addSalesCreditNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    }

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

    // Validate Sales Order if provided
    if (value?.salesId && !(await checkIdExist(InvoiceModel, value?.salesId, "Sales", res))) return;

    // Validate Account Ledger if provided
    if (value?.accountLedgerId && !(await checkIdExist(accountGroupModel, value?.accountLedgerId, "Account Ledger", res))) return;

    // Validate Salesman if provided
    if (value?.salesManId && !(await checkIdExist(userModel, value?.salesManId, "Salesman", res))) return;

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

    // Generate credit note number if not provided
    if (!value?.creditNoteNo) {
      value.creditNoteNo = await generateSequenceNumber({
        model: salesCreditNoteModel,
        prefix: "SCN",
        fieldName: "creditNoteNo",
        companyId: value.companyId,
      });
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(salesCreditNoteModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Sales Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editSalesCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editSalesCreditNoteSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(salesCreditNoteModel, { _id: value?.salesCreditNoteId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Sales Credit Note"), {}, {}));
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

    if (value?.salesId && value?.salesId !== isExist?.salesId?.toString()) {
      if (!(await checkIdExist(SalesOrderModel, value?.salesId, "Sales Order", res))) return;
    }

    if (value?.accountLedgerId && value?.accountLedgerId !== isExist?.accountLedgerId?.toString()) {
      if (!(await checkIdExist(accountGroupModel, value?.accountLedgerId, "Account Ledger", res))) return;
    }

    if (value?.salesManId && value?.salesManId !== isExist?.salesManId?.toString()) {
      if (!(await checkIdExist(employeeModel, value?.salesManId, "Salesman", res))) return;
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

    const response = await updateData(salesCreditNoteModel, { _id: new ObjectId(value?.salesCreditNoteId) }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Sales Credit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Sales Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteSalesCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteSalesCreditNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(salesCreditNoteModel, value?.id, "Sales Credit Note", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(salesCreditNoteModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Sales Credit Note"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Sales Credit Note"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllSalesCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, activeFilter, companyFilter, statusFilter, startDate, endDate } = req.query;

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
      criteria.$or = [{ creditNoteNo: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter === "true";

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "creditNoteDate");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        {
          path: "customerId",
          select: "firstName lastName companyName email phoneNo address contactType",
          populate: [
            { path: "address.country", select: "name" },
            { path: "address.state", select: "name" },
            { path: "address.city", select: "name" },
          ],
        },
        { path: "salesId", select: "invoiceNo" },
        {
          path: "productDetails.productId",
          select: "name itemCode sellingPrice",
        },
        { path: "productDetails.uomId", select: "name" },
        { path: "productDetails.taxId", select: "name percentage" },
        { path: "additionalCharges.chargeId", select: "name type" },
        { path: "additionalCharges.taxId", select: "name percentage" },
        { path: "shippingDetails.transporterId", select: "firstName lastName" },
        { path: "termsAndConditionIds", select: "termsCondition" },
        { path: "companyId", select: "name" },
        { path: "salesManId", select: "firstName lastName" },
        { path: "accountLedgerId", select: "name" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    let response = await getDataWithSorting(salesCreditNoteModel, criteria, {}, options);

    // Manually extract billing and shipping addresses from the populated customer object
    response = response.map((scn: any) => {
      let scnObj = scn.toObject ? scn.toObject() : scn;

      if (scnObj.customerId && scnObj.customerId.address) {
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
        scnObj.customerId.address = scnObj.customerId.address.map(extractAddressFields);

        if (scnObj.billingAddress) {
          const billingStr = scnObj.billingAddress.toString();
          const billingAddr = scnObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
          if (billingAddr) {
            scnObj.billingAddress = extractAddressFields(billingAddr);
          }
        }
        if (scnObj.shippingAddress) {
          const shippingStr = scnObj.shippingAddress.toString();
          const shippingAddr = scnObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
          if (shippingAddr) {
            scnObj.shippingAddress = extractAddressFields(shippingAddr);
          }
        }
      }
      return scnObj;
    });
    const totalData = await countData(salesCreditNoteModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Credit Note"), { salesCreditNote_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneSalesCreditNote = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getSalesCreditNoteSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let response: any = await getFirstMatch(
      salesCreditNoteModel,
      { _id: new ObjectId(value?.id), isDeleted: false },
      {},
      {
        populate: [
          {
            path: "customerId",
            select: "firstName lastName companyName email phoneNo address contactType",
            populate: [
              { path: "address.country", select: "name" },
              { path: "address.state", select: "name" },
              { path: "address.city", select: "name" },
            ],
          },
          { path: "salesId", select: "invoiceNo" },
          {
            path: "productDetails.productId",
            select: "name itemCode sellingPrice hsn gst",
          },
          { path: "productDetails.uomId", select: "name" },
          { path: "productDetails.taxId", select: "name percentage" },
          { path: "additionalCharges.chargeId", select: "name type" },
          { path: "additionalCharges.taxId", select: "name percentage" },
          { path: "termsAndConditionIds", select: "termsCondition" },
          { path: "companyId", select: "name gstNo" },
          { path: "accountLedgerId", select: "name" },
          { path: "salesManId", select: "firstName lastName" },
          { path: "accountLedgerId", select: "name" },
          { path: "shippingDetails.transporterId", select: "firstName lastName" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Sales Credit Note"), {}, {}));
    }

    let scnObj = response.toObject ? response.toObject() : response;

    if (scnObj.customerId && scnObj.customerId.address) {
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
      scnObj.customerId.address = scnObj.customerId.address.map(extractAddressFields);

      if (scnObj.billingAddress) {
        const billingStr = scnObj.billingAddress.toString();
        const billingAddr = scnObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === billingStr);
        if (billingAddr) {
          scnObj.billingAddress = extractAddressFields(billingAddr);
        }
      }
      if (scnObj.shippingAddress) {
        const shippingStr = scnObj.shippingAddress.toString();
        const shippingAddr = scnObj.customerId.address.find((addr: any) => addr._id && addr._id.toString() === shippingStr);
        if (shippingAddr) {
          scnObj.shippingAddress = extractAddressFields(shippingAddr);
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Credit Note"), scnObj, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getSalesCreditNoteDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { customerFilter, search, companyFilter, statusFilter } = req.query;

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (customerFilter) {
      criteria.customerId = customerFilter;
    }

    if (statusFilter) {
      criteria.status = statusFilter;
    }

    if (search) {
      criteria.$or = [{ creditNoteNo: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { creditNoteDate: -1 },
      limit: search ? 50 : 1000,
      populate: [{ path: "customerId", select: "firstName lastName companyName" }],
    };

    const response = await getDataWithSorting(
      salesCreditNoteModel,
      criteria,
      {
        creditNoteNo: 1,
        creditNoteDate: 1,
        "summary.netAmount": 1,
      },
      options,
    );

    const dropdownData = response.map((item: any) => ({
      _id: item._id,
      name: item.creditNoteNo,
      creditNoteNo: item.creditNoteNo,
      creditNoteDate: item.creditNoteDate,
      netAmount: item.summary?.netAmount || 0,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Sales Credit Note Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
