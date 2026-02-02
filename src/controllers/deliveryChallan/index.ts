import { apiResponse, HTTP_STATUS } from "../../common";
import { contactModel, deliveryChallanModel, InvoiceModel, productModel, taxModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addDeliveryChallanSchema, deleteDeliveryChallanSchema, editDeliveryChallanSchema, getDeliveryChallanSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

// Generate unique delivery challan number
const generateDeliveryChallanNo = async (companyId: any): Promise<string> => {
  const count = await deliveryChallanModel.countDocuments({ companyId: companyId, isDeleted: false });
  const prefix = "DC";
  const number = String(count + 1).padStart(6, "0");
  return `${prefix}${number}`;
};

export const addDeliveryChallan = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addDeliveryChallanSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Validate customer exists
    if (!(await checkIdExist(contactModel, value?.customerId, "Customer", res))) return;

    // Validate invoice if provided
    if (value.invoiceId && !(await checkIdExist(InvoiceModel, value.invoiceId, "Invoice", res))) return;

    // Validate products exist
    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
      if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
    }

    // Generate document number if not provided
    if (!value.documentNo) {
      value.documentNo = await generateDeliveryChallanNo(value.companyId);
    }

    // Get customer name
    const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
    if (customer) {
      value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(deliveryChallanModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
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

    // Validate customer if being changed
    if (value.customerId && value.customerId !== isExist.customerId.toString()) {
      if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
      const customer = await getFirstMatch(contactModel, { _id: value.customerId, isDeleted: false }, {}, {});
      if (customer) {
        value.customerName = customer.companyName || `${customer.firstName} ${customer.lastName || ""}`.trim();
      }
    }

    // Validate invoice if being changed
    if (value.invoiceId && value.invoiceId !== isExist.invoiceId?.toString()) {
      if (!(await checkIdExist(InvoiceModel, value.invoiceId, "Invoice", res))) return;
    }

    // Validate products if items are being updated
    if (value.items && value.items.length > 0) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item?.productId, "Product", res))) return;
        if (item.taxId && !(await checkIdExist(taxModel, item.taxId, "Tax", res))) return;
      }
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

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(deliveryChallanModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Delivery Challan"), {}, {}));
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
    let { page = 1, limit = 10, search, status, startDate, endDate, activeFilter, companyFilter } = req.query;

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
      criteria.$or = [{ documentNo: { $regex: search, $options: "si" } }, { customerName: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (status) {
      criteria.status = status;
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.date = { $gte: start, $lte: end };
      }
    }

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "customerId", select: "firstName lastName companyName email phoneNo" },
        { path: "invoiceId", select: "documentNo" },
        { path: "items.productId", select: "name itemCode" },
        { path: "items.taxId", select: "name percentage" },
        { path: "companyId", select: "name " },
        { path: "branchId", select: "name " },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(deliveryChallanModel, criteria, {}, options);
    const totalData = await countData(deliveryChallanModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Delivery Challan"), { deliveryChallan_data: response, totalData, state }, {}));
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
          { path: "customerId", select: "firstName lastName companyName email phoneNo address" },
          { path: "invoiceId", select: "documentNo date netAmount" },
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

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Delivery Challan"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
