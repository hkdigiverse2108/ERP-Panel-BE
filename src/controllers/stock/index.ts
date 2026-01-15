import { apiResponse, HTTP_STATUS, USER_ROLES } from "../../common";
import { branchModel, companyModel, productModel, stockModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addStockSchema, deleteStockSchema, editStockSchema } from "../../validation/stock";

export const addStock = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = addStockSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));


    if (user?.role?.name !== USER_ROLES.SUPER_ADMIN) {
      value.companyId = user?.companyId?._id;
    }

    if (!(await checkIdExist(companyModel, value?.companyId, "Company", res))) return;
    if (!(await checkIdExist(branchModel, value?.branchId, "Branch", res))) return;
    if (!(await checkIdExist(productModel, value?.productId, "Product", res))) return;

    const existingStockCriteria: any = {
      productId: value?.productId,
      isDeleted: false,
    };

    if (value?.companyId) existingStockCriteria.companyId = value.companyId;

    if (value?.branchId) existingStockCriteria.branchId = value.branchId;

    const existingStock = await getFirstMatch(stockModel, existingStockCriteria, {}, {});
    if (existingStock) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Stock record for this product, batch "), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(stockModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Stock"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editStock = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = editStockSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isExist = await getFirstMatch(stockModel, { _id: value?.stockId, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Stock"), {}, {}));

    if (value?.productId && value.productId !== isExist.productId.toString()) {
      const product = await getFirstMatch(productModel, { _id: value?.productId, isDeleted: false }, {}, {});
      if (!product) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));
    }

    const checkProductId = value?.productId || isExist.productId;
    const checkBatchNo = value?.batchNo !== undefined ? value.batchNo : isExist.batchNo;
    const checkBranchId = value?.branchId !== undefined ? value.branchId : isExist.branchId;

    if (value?.productId || value?.batchNo !== undefined || value?.branchId !== undefined) {
      const duplicateCriteria: any = {
        isDeleted: false,
        _id: { $ne: value?.stockId },
        productId: checkProductId,
      };

      if (checkBatchNo) duplicateCriteria.batchNo = checkBatchNo;

      if (checkBranchId) duplicateCriteria.branchId = checkBranchId;

      const duplicateStock = await getFirstMatch(stockModel, duplicateCriteria, {}, {});

      if (duplicateStock) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Stock record for this product, batch, and location"), {}, {}));
    }

    const { stockId, ...updateValues } = value;
    updateValues.updatedBy = user?._id || null;

    const response = await updateData(stockModel, { _id: stockId }, updateValues, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Stock"), {}, {}));
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Stock"), response, {}));
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
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Stock"), {}, {}));
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
    const { page = 1, limit = 10, search, activeFilter, categoryFilter, subCategoryFilter, brandFilter, subBrandFilter, hsnCodeFilter, purchaseTaxFilter, salesTaxIdFilter, productTypeFilter, branchFilter, minStockQty, maxStockQty, expiryFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { itemCode: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

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
        // { path: "departmentId", select: "name" },
        { path: "uomId", select: "name code" },
        { path: "branchId", select: "name" },
      ],
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      limit: parseInt(limit as string),
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
      })
    );

    const filteredStockData = stockData.filter((item) => item !== null);

    const totalPages = Math.ceil(totalData / parseInt(limit as string)) || 1;

    const stateObj = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages,
      totalData,
      hasNextPage: parseInt(page as string) < totalPages,
      hasPrevPage: parseInt(page as string) > 1,
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
        {}
      )
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
      }
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
      }
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
