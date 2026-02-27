import { apiResponse, HTTP_STATUS, RETURN_POS_ORDER_TYPE, POS_ORDER_STATUS } from "../../common";
import { returnPosOrderModel, productModel, stockModel, contactModel, PosOrderModel, bankModel, posCreditNoteModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, generateSequenceNumber, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, checkStockQty } from "../../helper";
import { addReturnPosOrderSchema, editReturnPosOrderSchema, getReturnPosOrderSchema, deleteReturnPosOrderSchema, returnPosOrderDropDownSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addReturnPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = addReturnPosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);
    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    if (value.posOrderId && !(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
    if (value.customerId && !(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
    if (value.bankAccountId && !(await checkIdExist(bankModel, value.bankAccountId, "Bank Account", res))) return;

    for (const item of value.items) {
      if (!(await checkIdExist(productModel, item.productId, "Product", res))) return;
    }

    const originalOrder = await PosOrderModel.findOne({ _id: value.posOrderId, isDeleted: false });
    if (!originalOrder) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Original POS Order"), {}, {}));
    }

    // Validate return quantities
    for (const returnItem of value.items) {
      const originalItem = originalOrder.items.find((item) => item.productId.toString() === returnItem.productId.toString());
      if (!originalItem) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Product was not part of original order`, {}, {}));
      }

      const availableToReturn = originalItem.qty - (originalItem.returnedQty || 0);
      if (returnItem.qty > availableToReturn) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Return quantity ${returnItem.qty} exceeds available to return ${availableToReturn} for selected product`, {}, {}));
      }
    }

    value.returnOrderNo = await generateSequenceNumber({ model: returnPosOrderModel, prefix: "RETPOS", fieldName: "returnOrderNo", companyId: value.companyId });

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(returnPosOrderModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    // Update original order quantities and status
    let totalPurchasedQty = 0;
    let totalReturnedQty = 0;
    let totalReturnedAmount = 0;

    originalOrder.items.forEach((originalItem: any) => {
      const returnItem = response.items.find((item: any) => item.productId.toString() === originalItem.productId.toString());
      if (returnItem) {
        originalItem.returnedQty = (Number(originalItem.returnedQty) || 0) + Number(returnItem.qty);
      }
      totalPurchasedQty += Number(originalItem.qty) || 0;
      totalReturnedQty += Number(originalItem.returnedQty) || 0;
    });

    const allReturns = await returnPosOrderModel.find({ posOrderId: originalOrder._id, isDeleted: false });
    totalReturnedAmount = allReturns.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    originalOrder.totalReturnedQty = totalReturnedQty;
    originalOrder.returnedAmount = totalReturnedAmount;

    if (totalReturnedQty >= totalPurchasedQty) {
      originalOrder.status = POS_ORDER_STATUS.RETURNED;
    } else if (totalReturnedQty > 0) {
      originalOrder.status = POS_ORDER_STATUS.PARTIALLY_RETURNED;
    } else {
      originalOrder.status = POS_ORDER_STATUS.COMPLETED;
    }

    originalOrder.markModified("items");
    await originalOrder.save();

    // --- Stock Management Logic ---
    // Increase stock for returned items
    for (const item of response.items) {
      await stockModel.findOneAndUpdate({ productId: item.productId, companyId: response.companyId, isDeleted: false }, { $inc: { qty: item.qty } });
    }
    // ----------------------------

    // --- Create POS Credit Note if type is sales_return ---
    if (response.type === RETURN_POS_ORDER_TYPE.SALES_RETURN) {
      const creditNoteData = {
        companyId: response.companyId,
        customerId: response.customerId,
        returnPosOrderId: response._id,
        totalAmount: response.total,
        creditsRemaining: response.total,
        creditNoteNo: await generateSequenceNumber({ model: posCreditNoteModel, prefix: "POSCN", fieldName: "creditNoteNo", companyId: response.companyId }),
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };
      await createOne(posCreditNoteModel, creditNoteData);
    }
    // ------------------------------------------------------

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Return POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editReturnPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = editReturnPosOrderSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(returnPosOrderModel, { _id: value?.returnPosOrderId, isDeleted: false }, {}, {});
    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Return POS Order"), {}, {}));
    }

    if (value.posOrderId && !(await checkIdExist(PosOrderModel, value.posOrderId, "POS Order", res))) return;
    if (value.customerId && !(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;
    if (value.bankAccountId && !(await checkIdExist(bankModel, value.bankAccountId, "Bank Account", res))) return;

    if (value.items) {
      for (const item of value.items) {
        if (!(await checkIdExist(productModel, item.productId, "Product", res))) return;
      }

      // Check stock qty
      // We pass value.items as "new" and isExist.items as "old"
      // The helper will check if (New qty - Old qty) > Available Stock
      // Note: In return orders, reducing 'qty' means DECREASING stock,
      // so we calculate it such that netChange > 0 represents a stock deduction.
      const checkItems = isExist.items.map((item) => {
        const newItem = value.items.find((ni) => ni.productId?.toString() === item.productId?.toString());
        const newQty = newItem ? newItem.qty : 0;
        return { productId: item.productId, qty: item.qty - newQty };
      });
      if (!(await checkStockQty(checkItems, isExist.companyId, res))) return;
    }

    const originalOrder = await PosOrderModel.findOne({ _id: isExist.posOrderId, isDeleted: false });
    if (!originalOrder) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Original POS Order"), {}, {}));
    }

    // Validate return quantities (taking into account already returned quantities minus this order's quantities)
    if (value.items) {
      for (const returnItem of value.items) {
        const originalItem = originalOrder.items.find((item) => item.productId.toString() === returnItem.productId.toString());
        if (!originalItem) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Product was not part of original order`, {}, {}));
        }

        const oldReturnItem = isExist.items.find((item) => item.productId.toString() === returnItem.productId.toString());
        const otherReturnedQty = (originalItem.returnedQty || 0) - (oldReturnItem ? oldReturnItem.qty : 0);
        const availableToReturn = originalItem.qty - otherReturnedQty;

        if (returnItem.qty > availableToReturn) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Return quantity ${returnItem.qty} exceeds available to return ${availableToReturn} for selected product`, {}, {}));
        }
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(returnPosOrderModel, { _id: value?.returnPosOrderId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Return POS Order"), {}, {}));
    }

    // Update original order quantities and status
    // 1. Revert old returned quantities
    originalOrder.items.forEach((originalItem: any) => {
      const oldReturnItem = isExist.items.find((item: any) => item.productId.toString() === originalItem.productId.toString());
      if (oldReturnItem) {
        originalItem.returnedQty = Math.max(0, (Number(originalItem.returnedQty) || 0) - Number(oldReturnItem.qty));
      }
    });

    // 2. Apply new returned quantities
    let totalPurchasedQty = 0;
    let totalReturnedQty = 0;
    let totalReturnedAmount = 0;

    originalOrder.items.forEach((originalItem: any) => {
      const newReturnItem = response.items.find((item: any) => item.productId.toString() === originalItem.productId.toString());
      if (newReturnItem) {
        originalItem.returnedQty = (Number(originalItem.returnedQty) || 0) + Number(newReturnItem.qty);
      }
      totalPurchasedQty += Number(originalItem.qty) || 0;
      totalReturnedQty += Number(originalItem.returnedQty) || 0;
    });

    const allReturns = await returnPosOrderModel.find({ posOrderId: originalOrder._id, isDeleted: false });
    totalReturnedAmount = allReturns.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    originalOrder.totalReturnedQty = totalReturnedQty;
    originalOrder.returnedAmount = totalReturnedAmount;

    if (totalReturnedQty >= totalPurchasedQty) {
      originalOrder.status = POS_ORDER_STATUS.RETURNED;
    } else if (totalReturnedQty > 0) {
      originalOrder.status = POS_ORDER_STATUS.PARTIALLY_RETURNED;
    } else {
      originalOrder.status = POS_ORDER_STATUS.COMPLETED; // Revert to completed or whatever appropriate status
    }

    originalOrder.markModified("items");
    await originalOrder.save();

    // --- Stock Management Logic ---
    // 1. Revert old quantities (decrease stock since we increased it on create)
    for (const item of isExist.items) {
      await stockModel.findOneAndUpdate({ productId: item.productId, companyId: isExist.companyId, isDeleted: false }, { $inc: { qty: -item.qty } });
    }

    // 2. Apply new quantities (increase stock)
    for (const item of response.items) {
      await stockModel.findOneAndUpdate({ productId: item.productId, companyId: response.companyId, isDeleted: false }, { $inc: { qty: item.qty } });
    }
    // ----------------------------

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Return POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getAllReturnPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, customerId, type, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) criteria.companyId = companyId;
    if (customerId) criteria.customerId = new ObjectId(customerId);
    if (type) criteria.type = type;

    if (search) {
      criteria.$or = [{ returnOrderNo: { $regex: search, $options: "si" } }, { reason: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
      populate: [
        { path: "customerId", select: "firstName lastName " },
        { path: "posOrderId", select: "orderNo" },
        { path: "items.productId", select: "name" },
        { path: "bankAccountId", select: "name" },

        { path: "salesManId", select: "fullName" },
      ],
    };

    const response = await getDataWithSorting(returnPosOrderModel, criteria, {}, options);
    const totalData = await countData(returnPosOrderModel, criteria);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Return POS Order"), { returnPosOrder_data: response, totalData, state: { page, limit, totalPages: Math.ceil(totalData / limit) } }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getOneReturnPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getReturnPosOrderSchema.validate(req.params);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      returnPosOrderModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "customerId", select: "firstName lastName " },
          { path: "posOrderId", select: "orderNo" },
          { path: "items.productId", select: "name" },
          { path: "bankAccountId", select: "name" },

          { path: "salesManId", select: "fullName" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Return POS Order"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Return POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const deleteReturnPosOrder = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteReturnPosOrderSchema.validate(req.params);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isExist = await getFirstMatch(returnPosOrderModel, { _id: value.id, isDeleted: false }, {}, {});
    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Return POS Order"), {}, {}));

    const response = await updateData(returnPosOrderModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Return POS Order"), {}, {}));

    // Update original order quantities and status
    const originalOrder = await PosOrderModel.findOne({ _id: isExist.posOrderId, isDeleted: false });
    if (originalOrder) {
      let totalPurchasedQty = 0;
      let totalReturnedQty = 0;
      let totalReturnedAmount = 0;

      originalOrder.items.forEach((originalItem: any) => {
        const deletedReturnItem = isExist.items.find((item: any) => item.productId.toString() === originalItem.productId.toString());
        if (deletedReturnItem) {
          originalItem.returnedQty = Math.max(0, (Number(originalItem.returnedQty) || 0) - Number(deletedReturnItem.qty));
        }
        totalPurchasedQty += Number(originalItem.qty) || 0;
        totalReturnedQty += Number(originalItem.returnedQty) || 0;
      });

      const allReturns = await returnPosOrderModel.find({ posOrderId: originalOrder._id, isDeleted: false });
      totalReturnedAmount = allReturns.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

      originalOrder.totalReturnedQty = totalReturnedQty;
      originalOrder.returnedAmount = totalReturnedAmount;

      if (totalReturnedQty >= totalPurchasedQty) {
        originalOrder.status = POS_ORDER_STATUS.RETURNED;
      } else if (totalReturnedQty > 0) {
        originalOrder.status = POS_ORDER_STATUS.PARTIALLY_RETURNED;
      } else {
        originalOrder.status = POS_ORDER_STATUS.COMPLETED;
      }

      originalOrder.markModified("items");
      await originalOrder.save();
    }

    // --- Stock Management Logic ---
    // When we delete a return, we revert the stock increase (which means we decrease stock).
    // We pass the items as 'new' items to check against current stock.
    const itemsToDeduct = isExist.items.map((item) => ({ productId: item.productId, qty: item.qty }));
    if (!(await checkStockQty(itemsToDeduct, isExist.companyId, res))) return;

    // Decrease stock for deleted return order
    for (const item of isExist.items) {
      await stockModel.findOneAndUpdate({ productId: item.productId, companyId: isExist.companyId, isDeleted: false }, { $inc: { qty: -item.qty } });
    }
    // ----------------------------

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Return POS Order"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};

export const returnPosOrderDropDown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { error, value } = returnPosOrderDropDownSchema.validate(req.query);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const { search, customerId, type } = value;
    let criteria: any = { isDeleted: false, isActive: true };
    if (companyId) criteria.companyId = companyId;
    if (customerId) criteria.customerId = new ObjectId(customerId);
    if (type) criteria.type = type;

    if (search) {
      criteria.$or = [{ returnOrderNo: { $regex: search, $options: "si" } }];
    }

    const response = await returnPosOrderModel.find(criteria, { returnOrderNo: 1, total: 1 }).sort({ createdAt: -1 }).limit(100);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Return POS Order Dropdown"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
  }
};
