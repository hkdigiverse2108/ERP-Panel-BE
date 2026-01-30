import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { branchModel, materialConsumptionModel, productModel, stockModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addStockSchema, bulkStockAdjustmentSchema, deleteStockSchema, editStockSchema } from "../../validation/stock";
import { generateConsumptionNo } from "../materialConsumption";

export const addStock = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = addStockSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    if (!(await checkIdExist(branchModel, value?.branchId, "Branch", res))) return;
    if (!(await checkIdExist(productModel, value?.productId, "Product", res))) return;

    const existingStockCriteria: any = {
      productId: value?.productId,
      isDeleted: false,
    };

    if (value?.companyId) existingStockCriteria.companyId = value.companyId;

    if (value?.branchId) existingStockCriteria.branchId = value.branchId;

    const existingStock = await getFirstMatch(stockModel, existingStockCriteria, {}, {});
    if (existingStock) {
      let stock = await updateData(stockModel, { _id: existingStock?._id }, value, {});
      if (!stock) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Stock"), stock, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(stockModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    await updateData(productModel, { _id: value?.productId }, { companyIds: { $in: [value?.companyId] } }, {});
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Stock"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editStock = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = editStockSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    if (!value.length) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Stock items are required"), {}, {}));

    const updatedItems = [];

    for (const item of value) {
      const product = await getFirstMatch(productModel, { _id: item?.productId, isDeleted: false }, {}, {});
      if (!product) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

      const stockCriteria: any = {
        productId: item?.productId,
        isDeleted: false,
      };

      if (user?.userType !== USER_TYPES.SUPER_ADMIN && user?.companyId?._id) {
        stockCriteria.companyId = user?.companyId?._id;
      }

      if (user?.branchId?._id) {
        stockCriteria.branchId = user?.branchId?._id;
      }

      const stock = await getFirstMatch(stockModel, stockCriteria, {}, {});
      if (!stock) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock"), {}, {}));

      const currentQty = stock?.qty || 0;
      const nextQty = currentQty - item.qty;

      const updatedStock = await updateData(stockModel, { _id: stock?._id }, { qty: nextQty < 0 ? 0 : nextQty, updatedBy: user?._id || null }, {});

      if (!updatedStock) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Stock"), {}, {}));

      updatedItems.push(updatedStock);
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock"), { items: updatedItems }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const bulkStockAdjustment = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    let items = [];
    let type: string | null = null;

    const { error, value } = bulkStockAdjustmentSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    items = value?.items || [];
    type = value?.type || null;

    if (!items.length) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Stock items are required"), {}, {}));

    const updatedItems = [];
    const processedItems = [];

    for (const item of items) {
      const product = await getFirstMatch(productModel, { _id: item?.productId, isDeleted: false }, {}, {});
      if (!product) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

      const stockCriteria: any = {
        productId: item?.productId,
        isDeleted: false,
      };

      if (user?.userType !== USER_TYPES.SUPER_ADMIN && user?.companyId?._id) {
        stockCriteria.companyId = user?.companyId?._id;
      }

      const stock = await getFirstMatch(stockModel, stockCriteria, {}, {});
      if (!stock) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock"), {}, {}));

      item.price = stock?.mrp;
      item.totalPrice = item?.qty * item?.price;

      if ((stock?.qty || 0) < item?.qty) continue;

      const currentQty = stock?.qty || 0;
      const nextQty = currentQty - item.qty;

      const updatedStock = await updateData(stockModel, { _id: stock?._id }, { qty: nextQty < 0 ? 0 : nextQty, updatedBy: user?._id || null }, {});

      if (!updatedStock) continue;
      updatedItems.push(updatedStock);
      processedItems.push(item);
    }

    let consumptionRecord = null;

    if (processedItems.length) {
      const companyId = user?.companyId?._id || null;
      const consumptionNo = await generateConsumptionNo(companyId);
      const totalAmount = processedItems.reduce((sum, item: any) => {
        const itemTotal = item?.totalPrice ?? (item?.qty || 0) * (item?.price || 0);
        return sum + itemTotal;
      }, 0);
      const totalQty = processedItems.reduce((sum: number, item: any) => sum + (item?.qty || 0), 0);

      const consumptionPayload: any = {
        companyId,
        branchId: value?.branchId || user?.branchId?._id || null,
        number: consumptionNo,
        date: value?.consumptionDate || new Date(),
        type: type,
        remark: null,
        items: processedItems,
        totalAmount,
        totalQty,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };

      consumptionRecord = await createOne(materialConsumptionModel, consumptionPayload);
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock"), { type, items: updatedItems, consumption: consumptionRecord }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteStock = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = deleteStockSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(stockModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock"), {}, {}));
    }

    const response = await updateData(stockModel, { _id: value?.id }, { isDeleted: true, updatedBy: user?._id }, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Stock"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Stock"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllStock = async (req, res) => {
  reqInfo(req);
  try {
    const { page = 1, limit = 10, search, activeFilter, companyFilter, categoryFilter, subCategoryFilter, brandFilter, subBrandFilter, hsnCodeFilter, purchaseTaxFilter, salesTaxIdFilter, productTypeFilter, branchFilter, minStockQty, maxStockQty, expiryFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { itemCode: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (categoryFilter) criteria.categoryId = categoryFilter;

    if (subCategoryFilter) criteria.subCategoryId = subCategoryFilter;

    if (brandFilter) criteria.brandId = brandFilter;

    if (subBrandFilter) criteria.subBrandId = subBrandFilter;

    // if (departmentFilter) criteria.departmentId = departmentFilter;

    if (hsnCodeFilter) criteria.hsnCode = hsnCodeFilter;

    if (purchaseTaxFilter) criteria.purchaseTaxId = purchaseTaxFilter;

    if (salesTaxIdFilter) criteria.salesTaxId = salesTaxIdFilter;

    if (productTypeFilter) criteria.productType = productTypeFilter;

    if (branchFilter) criteria.branchId = branchFilter;

    if (expiryFilter !== undefined) criteria.hasExpiry = expiryFilter === "true";

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "categoryId", select: "name" },
        { path: "subCategoryId", select: "name" },
        { path: "brandId", select: "name" },
        { path: "subBrandId", select: "name" },
      ],
    };

    const products = await getDataWithSorting(productModel, criteria, {}, options);
    const totalData = await countData(productModel, criteria);

    const stockData = await Promise.all(
      products.map(async (product: any) => {
        const stockCriteria: any = {
          productId: product._id,
          isDeleted: false,
        };

        if (branchFilter) {
          stockCriteria.branchId = branchFilter;
        }

        // Aggregate stock quantities
        const stockAggregation = await stockModel.aggregate([
          { $match: stockCriteria },
          {
            $group: {
              _id: "$productId",
              totalQty: { $sum: "$qty" },
            },
          },
        ]);

        const availableQty = stockAggregation.length > 0 ? stockAggregation[0].totalQty : 0;

        if (minStockQty !== undefined || maxStockQty !== undefined) {
          const minQty = minStockQty ? parseFloat(minStockQty as string) : -Infinity;
          const maxQty = maxStockQty ? parseFloat(maxStockQty as string) : Infinity;
          if (availableQty < minQty || availableQty > maxQty) {
            return null;
          }
        }

        return {
          ...product,
          availableQty,
        };
      }),
    );

    const filteredStockData = stockData.filter((item) => item !== null);

    const totalPages = Math.ceil(totalData / parseInt(limit as string)) || 1;

    const stateObj = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("Stock"),
        {
          stock_data: filteredStockData,
          totalData,
          state: stateObj,
        },
        {},
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneStock = async (req, res) => {
  reqInfo(req);
  try {
    const { id } = req.params;
    const { branchId } = req.query;

    const product = await getFirstMatch(
      productModel,
      { _id: id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
          { path: "brandId", select: "name" },
          { path: "subBrandId", select: "name" },
          // { path: "departmentId", select: "name" },
          { path: "uomId", select: "name code" },
        ],
      },
    );

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));
    }

    const stockCriteria: any = {
      productId: id,
      isDeleted: false,
    };

    if (branchId) {
      stockCriteria.branchId = branchId;
    }

    const stockRecords = await getDataWithSorting(
      stockModel,
      stockCriteria,
      {},
      {
        populate: [
          { path: "productId", select: "name itemCode" },
          // { path: "branchId", select: "name" },
        ],
      },
    );

    const totalQty = stockRecords.reduce((sum: number, stock: any) => sum + (stock.qty || 0), 0);

    const response = {
      product: product,
      stockRecords,
      availableQty: totalQty,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
