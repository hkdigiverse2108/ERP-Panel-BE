import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { branchModel, companyModel, productModel, stockModel, uomModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter } from "../../helper";
import { addProductSchema, deleteProductSchema, editProductSchema, getProductSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    let { error, value } = addProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (userType !== USER_TYPES.SUPER_ADMIN) {
      value.companyId = user?.companyId?._id;
      if (!value?.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    if (value?.companyId && !(await checkIdExist(companyModel, value?.companyId, "Company", res))) return;

    if (value?.branchId && !(await checkIdExist(branchModel, value?.branchId, "Branch", res))) return;

    let isExist = await getFirstMatch(productModel, { $or: [{ name: value?.name }], isDeleted: false }, {}, {});

    if (isExist) {
      let errorText = "";
      if (isExist?.name === value?.name) errorText = "Product Name";
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist(errorText), {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    let response = await createOne(productModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = editProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const companyId = value?.companyId || user?.companyId?._id;

    if (companyId && !(await checkIdExist(companyModel, companyId, "Company", res))) return;

    if (value?.branchId && !(await checkIdExist(branchModel, value?.branchId, "Branch", res))) return;

    if (value?.uomId && !(await checkIdExist(uomModel, value?.uomId, "UOM", res))) return;

    let isExist = await getFirstMatch(productModel, { _id: value?.productId, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    isExist = await getFirstMatch(productModel, { isDeleted: false, $or: [{ name: value?.name }], _id: { $ne: value?.productId } }, {}, {});

    if (isExist) {
      let errorText = "";
      if (isExist?.name === value?.name) errorText = "Product Name";
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.dataAlreadyExist(errorText), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(productModel, { _id: value?.productId }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Product"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deleteProductSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isExist = await getFirstMatch(productModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    const payload = {
      updatedBy: user?._id || null,
      isDeleted: true,
    };

    const response = await updateData(productModel, { _id: value?.id }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Product"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;

    const companyId = user?.companyId?._id;
    const { page, limit, search, startDate, endDate, activeFilter, companyFilter, categoryFilter, subCategoryFilter, brandFilter, subBrandFilter, hsnCodeFilter, purchaseTaxFilter, salesTaxIdFilter, productTypeFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (search) {
      const searchCriteria = [{ name: { $regex: search, $options: "si" } }];
      if (criteria.$or) {
        criteria.$or = [...criteria.$or, ...searchCriteria];
      } else {
        criteria.$or = searchCriteria;
      }
    }

    if (categoryFilter) criteria.categoryId = categoryFilter;

    if (subCategoryFilter) criteria.subCategoryId = subCategoryFilter;

    if (brandFilter) criteria.brandId = brandFilter;

    if (subBrandFilter) criteria.subBrandId = subBrandFilter;

    if (hsnCodeFilter) criteria.hsnCode = hsnCodeFilter;

    if (purchaseTaxFilter) criteria.purchaseTaxId = purchaseTaxFilter;

    if (salesTaxIdFilter) criteria.salesTaxId = salesTaxIdFilter;

    if (productTypeFilter) criteria.productType = productTypeFilter;

    if (user.userType !== USER_TYPES.SUPER_ADMIN) {
      const stockCriteria: any = {
        isDeleted: false,
        companyId: user?.companyId?._id,
      };

      const stockEntries = await getDataWithSorting(stockModel, stockCriteria, { productId: 1 }, {});

      const productIds = (stockEntries || []).filter((s: any) => s.productId).map((s: any) => new ObjectId(s.productId.toString()));

      criteria._id = { $in: productIds };
    }

    if (companyFilter) {
      const stockCriteria: any = {
        isDeleted: false,
        companyId: companyFilter,
      };

      const stockEntries = await getDataWithSorting(stockModel, stockCriteria, { productId: 1 }, {});

      const productIds = (stockEntries || []).filter((s: any) => s.productId).map((s: any) => new ObjectId(s.productId.toString()));

      criteria._id = { $in: productIds };
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "categoryId", select: "name" },
        { path: "subCategoryId", select: "name" },
        { path: "brandId", select: "name" },
        { path: "subBrandId", select: "name" },
        // { path: "purchaseTaxId", select: "name percentage" },
        // { path: "salesTaxId", select: "name percentage" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }
    const response = await getDataWithSorting(productModel, criteria, { password: 0 }, options);
    const totalData = await countData(productModel, criteria);

    const productsWithStock = await Promise.all(
      response.map(async (product: any) => {
        const productObj = product.toObject ? product.toObject() : product;
        const linkedStockIds = (productObj.stockIds || []).filter((id: any) => id);

        let stockCriteria: any = { isDeleted: false };

        if (linkedStockIds.length > 0) {
          stockCriteria._id = { $in: linkedStockIds.map((id: any) => new ObjectId(id.toString())) };
          if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
            stockCriteria.companyId = companyId;
          }
        } else {
          stockCriteria.productId = product._id;
          if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
            stockCriteria.companyId = companyId;
          }
        }

        const stockAggregation = await stockModel.aggregate([
          { $match: stockCriteria },
          {
            $group: {
              _id: "$productId",
              totalQty: { $sum: "$qty" },
              totalMrp: { $sum: "$mrp" },
              totalSellingPrice: { $sum: "$sellingPrice" },
              totalSellingDiscount: { $sum: "$sellingDiscount" },
              totalLandingCost: { $sum: "$landingCost" },
              totalPurchasePrice: { $sum: "$purchasePrice" },
              totalSellingMargin: { $sum: "$sellingMargin" },
              uomId: { $first: "$uomId" },
            },
          },
          {
            $lookup: {
              from: "uoms",
              localField: "uomId",
              foreignField: "_id",
              as: "uomData",
            },
          },
          {
            $unwind: {
              path: "$uomData",
              preserveNullAndEmptyArrays: true,
            },
          },
          // 🎯 Shape the final output
          {
            $project: {
              uomId: 1,
              uomData: {
                _id: "$uomData._id",
                name: "$uomData.name",
                code: "$uomData.code",
              },
              totalQty: 1,
              totalMrp: 1,
              totalSellingPrice: 1,
              totalSellingDiscount: 1,
              totalLandingCost: 1,
              totalPurchasePrice: 1,
              totalSellingMargin: 1,
            },
          },
        ]);

        const qty = stockAggregation.length > 0 ? stockAggregation[0].totalQty : 0;

        return {
          ...productObj,
          mrp: stockAggregation.length > 0 ? stockAggregation[0].totalMrp : 0,
          sellingPrice: stockAggregation.length > 0 ? stockAggregation[0].totalSellingPrice : 0,
          sellingDiscount: stockAggregation.length > 0 ? stockAggregation[0].totalSellingDiscount : 0,
          landingCost: stockAggregation.length > 0 ? stockAggregation[0].totalLandingCost : 0,
          purchasePrice: stockAggregation.length > 0 ? stockAggregation[0].totalPurchasePrice : 0,
          sellingMargin: stockAggregation.length > 0 ? stockAggregation[0].totalSellingMargin : 0,
          qty,
          uomId: stockAggregation.length > 0 ? stockAggregation[0].uomData : null,
        };
      }),
    );

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), { product_data: productsWithStock, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getProductDropdown = async (req, res) => {
  reqInfo(req);
  try {
    let { user } = req?.headers,
      stockCriteria: any = { isDeleted: false, isActive: true };

    const companyId = user?.companyId?._id;

    const { productType, search, companyFilter, categoryFilter, brandFilter, isNewProduct, stockFilter } = req.query;

    if (companyId) stockCriteria.companyId = companyId;
    if (companyFilter) stockCriteria.companyId = companyFilter;

    if (stockFilter == "true") {
      stockCriteria.qty = { $gt: 0 };
    }

    let productIdsWithStock: string[] = [];
    const stockByProductId = new Map<string, any>();

    if (!isNewProduct) {
      const stockResponse = await getDataWithSorting(
        stockModel,
        stockCriteria,
        { productId: 1, qty: 1, mrp: 1, sellingDiscount: 1, sellingPrice: 1, sellingMargin: 1, landingCost: 1, purchasePrice: 1, purchaseTaxId: 1, salesTaxId: 1, isPurchaseTaxIncluding: 1, isSalesTaxIncluding: 1, uomId: 1 },
        {
          sort: { updatedAt: -1 },
          populate: [
            { path: "purchaseTaxId", select: "name percentage" },
            { path: "salesTaxId", select: "name percentage" },
            { path: "uomId", select: "name code" },
          ],
        },
      );

      productIdsWithStock = Array.from(new Set(stockResponse.map((s: any) => String(s.productId))));
      if (productIdsWithStock.length === 0) {
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), [], {}));
      }

      stockResponse.forEach((stock: any) => {
        const key = String(stock.productId);
        if (!stockByProductId.has(key)) stockByProductId.set(key, stock);
      });
    }

    let criteria: any = {
      isDeleted: false,
      isActive: true,
    };

    if (!isNewProduct && productIdsWithStock.length > 0) {
      criteria._id = { $in: productIdsWithStock };
    }

    if (productType) {
      criteria.productType = productType;
    }

    if (categoryFilter) {
      criteria.categoryId = categoryFilter;
    }

    if (brandFilter) {
      criteria.brandId = brandFilter;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }];
    }

    const response = await getDataWithSorting(
      productModel,
      criteria,
      { _id: 1, name: 1, productType: 1, mrp: 1, sellingDiscount: 1, sellingPrice: 1, sellingMargin: 1, landingCost: 1, purchasePrice: 1 },
      {
        sort: { name: 1 },
      },
    );

    const mergedResponse = response.map((product) => {
      const stock = stockByProductId.get(String(product._id));
      return {
        _id: product._id,
        name: product.name,
        productType: product.productType,
        qty: stock?.qty ?? 0,
        purchasePrice: stock?.purchasePrice ?? product.purchasePrice,
        landingCost: stock?.landingCost ?? product.landingCost,
        mrp: stock?.mrp ?? product.mrp,
        sellingPrice: stock?.sellingPrice ?? product.sellingPrice,
        sellingDiscount: stock?.sellingDiscount ?? product.sellingDiscount,
        sellingMargin: stock?.sellingMargin ?? product.sellingMargin,
        purchaseTaxId: stock?.purchaseTaxId,
        salesTaxId: stock?.salesTaxId,
        isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding,
        isSalesTaxIncluding: stock?.isSalesTaxIncluding,
        uomId: stock?.uomId,
      };
    });

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), mergedResponse, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { error, value } = getProductSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      productModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
          { path: "brandId", select: "name" },
          { path: "subBrandId", select: "name" },
          // { path: "purchaseTaxId", select: "name percentage" },
          // { path: "salesTaxId", select: "name percentage" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    const stockCriteria: any = {
      productId: response._id,
      isDeleted: false,
    };

    if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
      stockCriteria.companyId = companyId;
    }

    const stockAggregation = await stockModel.aggregate([
      { $match: stockCriteria },

      {
        $lookup: {
          from: "taxes",
          localField: "purchaseTaxId",
          foreignField: "_id",
          as: "purchaseTax",
        },
      },

      {
        $unwind: {
          path: "$purchaseTax",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "taxes",
          localField: "salesTaxId",
          foreignField: "_id",
          as: "salesTax",
        },
      },
      {
        $unwind: {
          path: "$salesTax",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "uoms",
          localField: "uomId",
          foreignField: "_id",
          as: "uomData",
        },
      },
      {
        $unwind: {
          path: "$uomData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$productId",
          totalQty: { $sum: "$qty" },
          totalMrp: { $sum: "$mrp" },
          totalSellingPrice: { $sum: "$sellingPrice" },
          totalSellingDiscount: { $sum: "$sellingDiscount" },
          totalLandingCost: { $sum: "$landingCost" },
          totalPurchasePrice: { $sum: "$purchasePrice" },
          totalSellingMargin: { $sum: "$sellingMargin" },

          purchaseTaxId: {
            $first: {
              _id: "$purchaseTax._id",
              name: "$purchaseTax.name",
              percentage: "$purchaseTax.percentage",
            },
          },

          salesTaxId: {
            $first: {
              _id: "$salesTax._id",
              name: "$salesTax.name",
              percentage: "$salesTax.percentage",
            },
          },

          isPurchaseTaxIncluding: { $first: "$isPurchaseTaxIncluding" },
          isSalesTaxIncluding: { $first: "$isSalesTaxIncluding" },
          uomData: { $first: "$uomData" },
        },
      },

      {
        $project: {
          uomId: 1,
          uomData: {
            _id: "$uomData._id",
            name: "$uomData.name",
            code: "$uomData.code",
          },
          totalQty: 1,
          totalMrp: 1,
          totalSellingPrice: 1,
          totalSellingDiscount: 1,
          totalLandingCost: 1,
          totalPurchasePrice: 1,
          totalSellingMargin: 1,
          purchaseTaxId: 1,
          salesTaxId: 1,
          isPurchaseTaxIncluding: 1,
          isSalesTaxIncluding: 1,
        },
      },
    ]);

    const stock = stockAggregation.length > 0 ? stockAggregation[0] : {};

    const productsWithStock = {
      ...(response.toObject ? response.toObject() : response),
      mrp: stock.totalMrp ?? 0,
      sellingPrice: stock.totalSellingPrice ?? 0,
      sellingDiscount: stock.totalSellingDiscount ?? 0,
      landingCost: stock.totalLandingCost ?? 0,
      purchasePrice: stock.totalPurchasePrice ?? 0,
      sellingMargin: stock.totalSellingMargin ?? 0,
      qty: stock.totalQty ?? 0,
      purchaseTaxId: stock.purchaseTaxId,
      salesTaxId: stock.salesTaxId,
      isPurchaseTaxIncluding: stock.isPurchaseTaxIncluding,
      isSalesTaxIncluding: stock.isSalesTaxIncluding,
      uomId: stock.uomData,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), productsWithStock, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
