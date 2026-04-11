import { apiResponse, HTTP_STATUS, PREFIX_MODULES, STOCK_TRANSFER_STATUS, USER_TYPES } from "../../common";
import { stockModel, stockTransferModel, productModel, ConsumptionTypeModel, materialConsumptionModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, getAndIncrementPrefix, checkCompany, checkBranch } from "../../helper";
import { addStockTransferSchema, approveStockTransferSchema, confirmReceiptStockTransferSchema, rejectStockTransferSchema, cancelStockTransferSchema, getStockTransferSchema, deleteStockTransferSchema, editStockTransferSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const requestStockTransfer = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = addStockTransferSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const companyId = await checkCompany(user, value);
    const requestedByBranchId = await checkBranch(user, value);
    if (!companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!requestedByBranchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));
    if (requestedByBranchId.toString() === value.requestedToBranchId.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Stock cannot be transferred to the same branch"), {}, {}));
    }

    const transferNo = await getAndIncrementPrefix({
      branchId: requestedByBranchId,
      companyId,
      prefixType: PREFIX_MODULES.STOCK_TRANSFER,
      model: stockTransferModel,
      fieldName: "transferNo",
    });

    value.companyId = companyId;
    value.branchId = requestedByBranchId;
    value.transferNo = transferNo;
    value.requestedByBranchId = requestedByBranchId;
    value.status = STOCK_TRANSFER_STATUS.PENDING;
    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(stockTransferModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Stock Transfer Request"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const approveStockTransfer = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = approveStockTransferSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const transfer = await getFirstMatch(stockTransferModel, { _id: value.stockTransferId, isDeleted: false }, {}, {});
    if (!transfer) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Transfer"), {}, {}));

    const userBranchId = user?.branchId?._id?.toString() || user?.branchId?.toString();
    if (user?.userType !== USER_TYPES.SUPER_ADMIN && userBranchId !== transfer.requestedToBranchId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.customMessage("Only the requested branch can approve this transfer"), {}, {}));
    }

    if (transfer.status !== STOCK_TRANSFER_STATUS.PENDING) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Only pending requests can be approved"), {}, {}));

    // Check stock availability in the requestedToBranch
    for (const item of value.items) {
      if (item.approvedQty <= 0) continue;

      const availableStock = await getFirstMatch(
        stockModel,
        {
          productId: item.productId,
          branchId: transfer.requestedToBranchId,
          isDeleted: false,
        },
        {},
        {},
      );

      if (!availableStock || availableStock.qty < item.approvedQty) {
        const product = await getFirstMatch(productModel, { _id: item.productId }, { name: 1 }, {});
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage(`Insufficient stock for product: ${product?.name || "Unknown"}. Available: ${availableStock?.qty || 0}`), {}, {}));
      }
    }

    // Deduct stock from the requestedToBranch
    for (const item of value.items) {
      if (item.approvedQty <= 0) continue;

      const senderStock = await getFirstMatch(
        stockModel,
        {
          productId: item.productId,
          branchId: transfer.requestedToBranchId,
          isDeleted: false,
        },
        {},
        {},
      );

      if (senderStock) {
        await updateData(stockModel, { _id: senderStock._id }, { $inc: { qty: -item.approvedQty } }, {});
      }
    }

    const itemMap = new Map(value.items.map((i) => [i.productId.toString(), i.approvedQty]));
    const updatedItems: any[] = [];

    for (const item of transfer.items) {
      const approvedQty = itemMap.has(item.productId.toString()) ? itemMap.get(item.productId.toString()) : 0;
      if (approvedQty > item.requestedQty) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage(`Approved quantity cannot be more than requested quantity (${item.requestedQty})`), {}, {}));
      }
      updatedItems.push({
        ...item,
        approvedQty,
      });
    }

    const isPartial = updatedItems.some((i) => i.approvedQty < i.requestedQty);
    const status = isPartial ? STOCK_TRANSFER_STATUS.PARTIALLY_APPROVED : STOCK_TRANSFER_STATUS.APPROVED;

    const updatePayload = {
      status,
      items: updatedItems,
      approvalNote: value.approvalNote,
      approvedBy: user?._id,
      approvedAt: new Date(),
      updatedBy: user?._id,
    };

    const response = await updateData(stockTransferModel, { _id: value.stockTransferId }, updatePayload, {});
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock Transfer"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const confirmReceiptStockTransfer = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = confirmReceiptStockTransferSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const transfer = await getFirstMatch(stockTransferModel, { _id: value.stockTransferId, isDeleted: false }, {}, {});
    if (!transfer) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Transfer"), {}, {}));

    const userBranchId = user?.branchId?._id?.toString() || user?.branchId?.toString();
    if (user?.userType !== USER_TYPES.SUPER_ADMIN && userBranchId !== transfer.requestedByBranchId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.customMessage("Only the requesting branch can confirm receipt for this transfer"), {}, {}));
    }

    if (![STOCK_TRANSFER_STATUS.APPROVED, STOCK_TRANSFER_STATUS.PARTIALLY_APPROVED].includes(transfer.status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Request must be approved before confirming receipt"), {}, {}));
    }

    const itemMap = new Map(value.items.map((i) => [i.productId.toString(), i.receivedQty]));
    const updatedItems: any[] = [];

    for (const item of transfer.items) {
      const receivedQty = itemMap.has(item.productId.toString()) ? itemMap.get(item.productId.toString()) : 0;
      if (receivedQty > item.approvedQty) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage(`Received quantity cannot be more than approved quantity (${item.approvedQty})`), {}, {}));
      }
      updatedItems.push({
        ...item,
        receivedQty,
      });
    }

    const discrepancyItems: any[] = [];
    let totalDiscrepancyAmount = 0;
    let totalDiscrepancyQty = 0;

    for (const item of updatedItems) {
      if (item.receivedQty < item.approvedQty) {
        const diffQty = item.approvedQty - item.receivedQty;
        const senderStock = await getFirstMatch(
          stockModel,
          {
            productId: item.productId,
            branchId: transfer.requestedToBranchId,
            isDeleted: false,
          },
          {},
          {},
        );
        const price = senderStock?.purchasePrice || 0;

        discrepancyItems.push({
          productId: item.productId,
          qty: diffQty,
          price: price,
          totalPrice: diffQty * price,
        });
        totalDiscrepancyQty += diffQty;
        totalDiscrepancyAmount += diffQty * price;
      }

      if (item.receivedQty <= 0) continue;

      const senderStock = await getFirstMatch(
        stockModel,
        {
          productId: item.productId,
          branchId: transfer.requestedToBranchId,
          isDeleted: false,
        },
        {},
        {},
      );

      const receiverStock = await getFirstMatch(
        stockModel,
        {
          productId: item.productId,
          branchId: transfer.requestedByBranchId,
          isDeleted: false,
        },
        {},
        {},
      );

      if (receiverStock) {
        await updateData(stockModel, { _id: receiverStock._id }, { $inc: { qty: item.receivedQty } }, {});
      } else {
        const product = await getFirstMatch(productModel, { _id: item.productId }, {}, {});
        const newStockPayload = {
          companyId: transfer.companyId,
          branchId: transfer.requestedByBranchId,
          productId: item.productId,
          qty: item.receivedQty,
          uomId: product?.uomId,
          purchasePrice: item.price || senderStock?.purchasePrice || 0,
          landingCost: item.price || senderStock?.landingCost || 0,
          mrp: senderStock?.mrp || 0,
          sellingPrice: senderStock?.sellingPrice || 0,
          createdBy: user?._id || null,
          updatedBy: user?._id || null,
        };
        const newStock = await createOne(stockModel, newStockPayload);
        await updateData(productModel, { _id: item.productId }, { $push: { stockIds: newStock?._id } }, {});
      }
    }

    if (discrepancyItems.length > 0) {
      let consumptionType = await getFirstMatch(ConsumptionTypeModel, { name: "Stock Transfer Loss" }, {}, {});
      if (!consumptionType) {
        consumptionType = await createOne(ConsumptionTypeModel, {
          companyId: transfer.companyId,
          name: "Stock Transfer Loss",
          isDefault: true,
          createdBy: user?._id || null,
          updatedBy: user?._id || null,
        });
      }

      const consumptionNo = await getAndIncrementPrefix({
        branchId: transfer.requestedToBranchId,
        companyId: transfer.companyId,
        prefixType: PREFIX_MODULES.MATERIAL_CONSUMPTION,
        model: materialConsumptionModel,
        fieldName: "number",
      });

      const consumptionPayload = {
        companyId: transfer.companyId,
        branchId: transfer.requestedToBranchId,
        number: consumptionNo,
        date: new Date(),
        consumptionTypeId: consumptionType?._id,
        remark: value.receiptNote || "Discrepancy in stock transfer",
        items: discrepancyItems,
        totalQty: totalDiscrepancyQty,
        totalAmount: totalDiscrepancyAmount,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };
      await createOne(materialConsumptionModel, consumptionPayload);
    }

    const updatePayload = {
      status: STOCK_TRANSFER_STATUS.COMPLETED,
      items: updatedItems,
      receiptNote: value.receiptNote,
      receivedBy: user?._id,
      receivedAt: new Date(),
      updatedBy: user?._id,
    };

    const response = await updateData(stockTransferModel, { _id: value.stockTransferId }, updatePayload, {});
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock Transfer Completed"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const rejectStockTransfer = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = rejectStockTransferSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const transfer = await getFirstMatch(stockTransferModel, { _id: value.stockTransferId, isDeleted: false }, {}, {});
    if (!transfer) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Transfer"), {}, {}));

    const userBranchId = user?.branchId?._id?.toString() || user?.branchId?.toString();
    if (user?.userType !== USER_TYPES.SUPER_ADMIN && userBranchId !== transfer.requestedToBranchId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.customMessage("Only the requested branch can reject this transfer"), {}, {}));
    }

    if ([STOCK_TRANSFER_STATUS.COMPLETED, STOCK_TRANSFER_STATUS.REJECTED, STOCK_TRANSFER_STATUS.CANCELLED].includes(transfer.status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage(`Request is already ${transfer.status}`), {}, {}));
    }

    // If it was already approved or dispatched, return the stock to source branch
    if ([STOCK_TRANSFER_STATUS.APPROVED, STOCK_TRANSFER_STATUS.PARTIALLY_APPROVED].includes(transfer.status)) {
      for (const item of transfer.items) {
        if (item.approvedQty <= 0) continue;

        const senderStock = await getFirstMatch(
          stockModel,
          {
            productId: item.productId,
            branchId: transfer.requestedToBranchId,
            isDeleted: false,
          },
          {},
          {},
        );

        if (senderStock) {
          await updateData(stockModel, { _id: senderStock._id }, { $inc: { qty: item.approvedQty } }, {});
        }
      }
    }

    const updatePayload = {
      status: STOCK_TRANSFER_STATUS.REJECTED,
      approvalNote: value.approvalNote,
      updatedBy: user?._id,
    };

    const response = await updateData(stockTransferModel, { _id: value.stockTransferId }, updatePayload, {});
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock Transfer Rejected"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const cancelStockTransfer = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = cancelStockTransferSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const transfer = await getFirstMatch(stockTransferModel, { _id: value.stockTransferId, isDeleted: false }, {}, {});
    if (!transfer) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Transfer"), {}, {}));

    const userBranchId = user?.branchId?._id?.toString() || user?.branchId?.toString();
    if (user?.userType !== USER_TYPES.SUPER_ADMIN && userBranchId !== transfer.requestedByBranchId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.customMessage("Only the requesting branch can cancel this transfer"), {}, {}));
    }

    if (transfer.status !== STOCK_TRANSFER_STATUS.PENDING) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Only pending requests can be cancelled"), {}, {}));
    }

    const updatePayload = {
      status: STOCK_TRANSFER_STATUS.CANCELLED,
      requestNote: value.requestNote,
      updatedBy: user?._id,
    };

    const response = await updateData(stockTransferModel, { _id: value.stockTransferId }, updatePayload, {});
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock Transfer Cancelled"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editStockTransfer = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = editStockTransferSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const transfer = await getFirstMatch(stockTransferModel, { _id: value.stockTransferId, isDeleted: false }, {}, {});
    if (!transfer) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Transfer"), {}, {}));

    if (value.requestedToBranchId && transfer.requestedByBranchId.toString() === value.requestedToBranchId.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Stock cannot be transferred to the same branch"), {}, {}));
    }

    if (transfer.status !== STOCK_TRANSFER_STATUS.PENDING) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Only pending requests can be edited"), {}, {}));
    }

    const userBranchId = user?.branchId?._id?.toString() || user?.branchId?.toString();
    if (user?.userType !== USER_TYPES.SUPER_ADMIN && userBranchId !== transfer.requestedByBranchId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.customMessage("Only the requesting branch can edit this transfer"), {}, {}));
    }

    const { stockTransferId, ...updatePayload } = value;
    updatePayload.updatedBy = user?._id || null;

    const response = await updateData(stockTransferModel, { _id: stockTransferId }, updatePayload, {});
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Stock Transfer"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock Transfer"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getAllStockTransfer = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const { page, limit, search, activeFilter, statusFilter, typeFilter, companyFilter, branchFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) criteria.companyId = companyId;
    if (companyFilter) criteria.companyId = companyFilter;

    const effectiveBranchId = branchFilter || branchId;

    if (effectiveBranchId) {
      const branchObjId = new ObjectId(effectiveBranchId.toString());
      if (typeFilter === "incoming") {
        criteria.requestedByBranchId = branchObjId;
      } else if (typeFilter === "outgoing") {
        criteria.requestedToBranchId = branchObjId;
      } else {
        criteria.$or = [{ requestedByBranchId: branchObjId }, { requestedToBranchId: branchObjId }];
      }
    }

    if (statusFilter) criteria.status = statusFilter;
    if (search) criteria.transferNo = { $regex: search, $options: "si" };
    if (activeFilter) criteria.isActive = activeFilter == "true";
    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "requestedByBranchId", select: "name" },
        { path: "requestedToBranchId", select: "name" },
        { path: "items.productId", select: "name" },
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "createdBy", select: "fullName" },
        { path: "approvedBy", select: "fullName" },
        { path: "receivedBy", select: "fullName" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      options.limit = parseInt(limit as string);
    }

    let response = await getDataWithSorting(stockTransferModel, criteria, {}, options);

    if (effectiveBranchId) {
      const branchIdStr = effectiveBranchId.toString();
      response = response.map((item: any) => {
        const itemObj = item.toObject ? item.toObject() : item;
        let type = "";

        const reqBy = itemObj.requestedByBranchId?._id?.toString() || itemObj.requestedByBranchId?.toString();
        const reqTo = itemObj.requestedToBranchId?._id?.toString() || itemObj.requestedToBranchId?.toString();

        if (reqBy === branchIdStr) {
          type = "incoming";
        } else if (reqTo === branchIdStr) {
          type = "outgoing";
        }

        return { ...itemObj, type };
      });
    }

    const totalData = await countData(stockTransferModel, criteria);
    const totalPages = Math.ceil(totalData / (limit ? parseInt(limit as string) : totalData)) || 1;

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock Transfer"), { stock_transfer: response, totalData, state: { page, limit, totalPages } }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getStockTransferById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getStockTransferSchema.validate(req.params);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      stockTransferModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "requestedByBranchId", select: "name" },
          { path: "requestedToBranchId", select: "name" },
          { path: "items.productId", select: "name itemCode mrp sellingPrice uomId" },
          { path: "approvedBy", select: "fullName" },
          { path: "receivedBy", select: "fullName" },
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Transfer"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock Transfer"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteStockTransfer = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = deleteStockTransferSchema.validate(req.params);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await stockTransferModel.deleteOne({ _id: value.id });

    if (response.deletedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock Transfer"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Stock Transfer"), {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
