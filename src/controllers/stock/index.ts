import { apiResponse, HTTP_STATUS, PREFIX_MODULES } from "../../common";
import { branchModel, ConsumptionTypeModel, materialConsumptionModel, productModel, stockModel } from "../../database";
import { checkBranch, checkCompany, checkIdExist, countData, createOne, getAndIncrementPrefix, getDataWithSorting, getFirstMatch, redisdelPattern, reqInfo, responseMessage, updateData, redisGet, redisSet } from "../../helper";
import { addStockSchema, bulkStockAdjustmentSchema, deleteStockSchema, editStockSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addStock = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = addStockSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);
    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));
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
      await redisdelPattern("product:*");
      await redisdelPattern("stock:*");
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Stock"), stock, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(stockModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    if (!existingStock) await updateData(productModel, { _id: value?.productId }, { $push: { stockIds: response?._id } }, {});
    await redisdelPattern("product:*");
    await redisdelPattern("stock:*");
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

      stockCriteria.companyId = await checkCompany(user, item);
      stockCriteria.branchId = await checkBranch(user, item);
      if (!stockCriteria.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
      if (!stockCriteria.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));

      const stock = await getFirstMatch(stockModel, stockCriteria, {}, {});
      if (!stock) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock"), {}, {}));

      const currentQty = stock?.qty || 0;
      const nextQty = currentQty - item.qty;

      const updatedStock = await updateData(stockModel, { _id: stock?._id }, { qty: nextQty < 0 ? 0 : nextQty, updatedBy: user?._id || null }, {});

      if (!updatedStock) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Stock"), {}, {}));

      updatedItems.push(updatedStock);
    }
    await redisdelPattern("product:*");
    await redisdelPattern("stock:*");
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

    const { error, value } = bulkStockAdjustmentSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    items = value?.items || [];

    if (!items.length) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.customMessage("Stock items are required"), {}, {}));

    const updatedItems = [];
    const processedItems = [];

    const companyId = await checkCompany(user, value);
    const branchId = await checkBranch(user, value);
    if (!companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));
    if (value?.consumptionTypeId) {
      const consumptionType = await getFirstMatch(ConsumptionTypeModel, { _id: value?.consumptionTypeId, isDeleted: false }, {}, {});
      if (!consumptionType) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Consumption Type"), {}, {}));
    }

    for (const item of items) {
      const product = await getFirstMatch(productModel, { _id: item?.productId, isDeleted: false }, {}, {});
      if (!product) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

      const stockCriteria: any = {
        productId: item?.productId,
        isDeleted: false,
        companyId,
        branchId,
      };

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
      const consumptionNo = await getAndIncrementPrefix({
        branchId,
        companyId,
        prefixType: PREFIX_MODULES.MATERIAL_CONSUMPTION,
        model: materialConsumptionModel,
        fieldName: "number",
      });
      const totalAmount = processedItems.reduce((sum, item: any) => {
        const itemTotal = item?.totalPrice ?? (item?.qty || 0) * (item?.price || 0);
        return sum + itemTotal;
      }, 0);
      const totalQty = processedItems.reduce((sum: number, item: any) => sum + (item?.qty || 0), 0);

      const consumptionPayload: any = {
        companyId,
        branchId,
        number: consumptionNo,
        date: value?.consumptionDate || new Date(),
        consumptionTypeId: value.consumptionTypeId,
        remark: null,
        items: processedItems,
        totalAmount,
        totalQty,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };

      consumptionRecord = await createOne(materialConsumptionModel, consumptionPayload);
    }

    if (updatedItems.length > 0) {
      await redisdelPattern("product:*");
      await redisdelPattern("stock:*");
    }
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock"), { items: updatedItems, consumption: consumptionRecord }, {}));
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
    await updateData(productModel, { _id: isExist?.productId }, { $pull: { stockIds: isExist?._id } }, {});
    await redisdelPattern("product:*");
    await redisdelPattern("stock:*");

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Stock"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllStock = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `stock:all:req:${JSON.stringify(req.query)}:user:${user?.userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock"), cachedData, {}));

    const { page, limit, search, activeFilter, companyFilter, branchFilter, categoryFilter, subCategoryFilter, brandFilter, subBrandFilter, hsnCodeFilter, purchaseTaxFilter, salesTaxIdFilter, productTypeFilter, minStockQty, maxStockQty, expiryFilter } = req.query;

    const stockMatchCriteria: any = { isDeleted: false };

    if (branchId) {
      stockMatchCriteria.branchId = branchId;
    }

    if (companyId) {
      stockMatchCriteria.companyId = companyId;
    }

    if (branchFilter) stockMatchCriteria.branchId = new ObjectId(branchFilter as string);
    if (companyFilter) stockMatchCriteria.companyId = new ObjectId(companyFilter as string);
    if (activeFilter !== undefined) stockMatchCriteria.isActive = activeFilter == "true";
    if (purchaseTaxFilter) stockMatchCriteria.purchaseTaxId = new ObjectId(purchaseTaxFilter as string);
    if (salesTaxIdFilter) stockMatchCriteria.salesTaxId = new ObjectId(salesTaxIdFilter as string);

    if (!companyFilter && user?.companyId?._id) {
      stockMatchCriteria.companyId = user?.companyId?._id;
    }

    const stockAggregationPipeline: any[] = [
      { $match: stockMatchCriteria },
      {
        $group: {
          _id: "$productId",
          totalQty: { $sum: "$qty" },
          branchId: { $first: "$branchId" },
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branchData",
        },
      },
      {
        $unwind: {
          path: "$branchData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          totalQty: 1,
          branchData: {
            _id: "$branchData._id",
            name: "$branchData.name",
          },
        },
      },
    ];

    if (minStockQty !== undefined || maxStockQty !== undefined) {
      const minQty = minStockQty ? parseFloat(minStockQty as string) : -Infinity;
      const maxQty = maxStockQty ? parseFloat(maxStockQty as string) : Infinity;
      stockAggregationPipeline.push({
        $match: {
          totalQty: { $gte: minQty, $lte: maxQty },
        },
      });
    }

    const stockByProduct = await stockModel.aggregate(stockAggregationPipeline);
    const productIdsWithStock = stockByProduct.map((s: any) => s._id);
    const qtyByProductId: Record<string, number> = {};
    const branchByProductId: Record<string, any> = {};
    stockByProduct.forEach((s: any) => {
      qtyByProductId[s._id.toString()] = s.totalQty;
      branchByProductId[s._id.toString()] = s.branchData;
    });
    if (productIdsWithStock.length === 0) {
      const stateObj = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: 0,
      };

      const result = {
        stock_data: [],
        totalData: 0,
        state: stateObj,
      };
      await redisSet(cacheKey, result, 3600);
      return res.status(HTTP_STATUS.OK).json(
        new apiResponse(
          HTTP_STATUS.OK,
          responseMessage?.getDataSuccess("Stock"),
          result,
          {},
        ),
      );
    }

    let criteria: any = {
      isDeleted: false,
      _id: { $in: productIdsWithStock },
    };

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { itemCode: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (categoryFilter) criteria.categoryId = categoryFilter;

    if (subCategoryFilter) criteria.subCategoryId = subCategoryFilter;

    if (brandFilter) criteria.brandId = brandFilter;

    if (subBrandFilter) criteria.subBrandId = subBrandFilter;

    if (hsnCodeFilter) criteria.hsnCode = hsnCodeFilter;

    if (productTypeFilter) criteria.productType = productTypeFilter;

    if (expiryFilter !== undefined) criteria.hasExpiry = expiryFilter === "true";

    const options: any = {
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      limit: parseInt(limit as string),
      populate: [
        { path: "companyId", select: "name" },
        { path: "categoryId", select: "name" },
        { path: "subCategoryId", select: "name" },
        { path: "brandId", select: "name" },
        { path: "subBrandId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
      ],
    };
    const products = await getDataWithSorting(productModel, criteria, {}, options);
    const totalData = await countData(productModel, criteria);

    const stockData = products.map((product: any) => ({
      ...product,
      availableQty: qtyByProductId[product._id.toString()] ?? 0,
      branchId: branchByProductId[product._id.toString()] ?? null,
    }));

    const totalPages = Math.ceil(totalData / parseInt(limit as string)) || 1;

    const stateObj = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages,
    };

    const result = {
      stock_data: stockData,
      totalData,
      state: stateObj,
    };
    await redisSet(cacheKey, result, 3600);

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("Stock"),
        result,
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

    const cacheKey = `stock:getOne:req:${JSON.stringify(req.params)}:query:${JSON.stringify(req.query)}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock"), cachedData, {}));

    const product = await getFirstMatch(
      productModel,
      { _id: id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
          { path: "brandId", select: "name" },
          { path: "subBrandId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
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
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "purchaseTaxId", select: "name" },
          { path: "salesTaxId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    const totalQty = stockRecords.reduce((sum: number, stock: any) => sum + (stock.qty || 0), 0);

    const response = {
      product: product,
      stockRecords,
      availableQty: totalQty,
    };

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Stock"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
