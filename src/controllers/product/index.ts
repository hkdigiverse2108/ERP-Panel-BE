import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { branchModel, companyModel, productModel, stockModel, uomModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
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

    isExist = await getFirstMatch(productModel, { isDeleted: false, $or: [{ name: value?.name }, { itemCode: value?.itemCode }], _id: { $ne: value?.productId } }, {}, {});

    if (isExist) {
      let errorText = "";
      if (isExist?.name === value?.name) errorText = "Product Name";
      if (isExist?.itemCode === value?.itemCode) errorText = "Product Item Code";
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
    const { page, limit, search, startDate, endDate, activeFilter } = req.query;

    let criteria: any = { isDeleted: false };
    let productIds: any[] = [];

    if (search) {
      const searchCriteria = [{ name: { $regex: search, $options: "si" } }, { itemCode: { $regex: search, $options: "si" } }];
      if (criteria.$or) {
        criteria.$or = [...criteria.$or, ...searchCriteria];
      } else {
        criteria.$or = searchCriteria;
      }
    }

    if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
      const stockCriteria: any = {
        isDeleted: false,
        companyId: companyId,
      };

      const stockEntries = await getDataWithSorting(stockModel, stockCriteria, { productId: 1 }, {});

      const uniqueProductIds = new Set<string>();
      stockEntries.forEach((stock: any) => {
        if (stock.productId) {
          uniqueProductIds.add(stock.productId.toString());
        }
      });
      productIds = Array.from(uniqueProductIds).map((id: string) => new ObjectId(id));

      if (productIds.length === 0) {
        const stateObj = {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 10,
          totalPages: 0,
        };
        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), { product_data: [], totalData: 0, state: stateObj }, {}));
      }

      criteria._id = { $in: productIds };
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.createdAt = {
          $gte: start,
          $lte: end,
        };
      }
    }

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "categoryId", select: "name" },
        { path: "subCategoryId", select: "name" },
        { path: "brandId", select: "name" },
        { path: "subBrandId", select: "name" },
        { path: "purchaseTaxId", select: "name" },
        { path: "salesTaxId", select: "name" },
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
        const stockCriteria: any = {
          productId: product._id,
          isDeleted: false,
        };

        if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
          stockCriteria.companyId = companyId;
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
            },
          },
        ]);

        const qty = stockAggregation.length > 0 ? stockAggregation[0].totalQty : 0;

        return {
          ...(product.toObject ? product.toObject() : product),
          mrp: stockAggregation.length > 0 ? stockAggregation[0].totalMrp : 0,
          sellingPrice: stockAggregation.length > 0 ? stockAggregation[0].totalSellingPrice : 0,
          sellingDiscount: stockAggregation.length > 0 ? stockAggregation[0].totalSellingDiscount : 0,
          landingCost: stockAggregation.length > 0 ? stockAggregation[0].totalLandingCost : 0,
          purchasePrice: stockAggregation.length > 0 ? stockAggregation[0].totalPurchasePrice : 0,
          sellingMargin: stockAggregation.length > 0 ? stockAggregation[0].totalSellingMargin : 0,
          qty,
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
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const { productType, search, companyFilter, categoryFilter, brandFilter } = req.query; // Optional filter by productType

    let criteria: any = { isDeleted: false, isActive: true };

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
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { itemCode: { $regex: search, $options: "si" } }];
    }

    const response = await getDataWithSorting(
      productModel,
      criteria,
      { _id: 1, name: 1, productType: 1, mrp: 1, sellingDiscount: 1, sellingPrice: 1, sellingMargin: 1, landingCost: 1, purchasePrice: 1 },
      {
        sort: { name: 1 },
      },
    );

    let stockCompanyId = null;
    if (userType === USER_TYPES.SUPER_ADMIN) {
      if (companyFilter) stockCompanyId = new ObjectId(companyFilter);
    } else if (companyId) {
      stockCompanyId = companyId;
    }

    if (!stockCompanyId) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), response, {}));
    }

    const productIds = response.map((item) => item._id);
    const stockResponse = await getDataWithSorting(stockModel, { isDeleted: false, isActive: true, companyId: stockCompanyId, productId: { $in: productIds } }, { productId: 1, qty: 1, mrp: 1, sellingDiscount: 1, sellingPrice: 1, sellingMargin: 1, landingCost: 1, purchasePrice: 1 }, { sort: { updatedAt: -1 } });

    const stockByProductId = new Map<string, any>();
    stockResponse.forEach((stock) => {
      const key = String(stock.productId);
      if (!stockByProductId.has(key)) stockByProductId.set(key, stock);
    });

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
    const { error, value } = getProductSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      productModel,
      { _id: value?.id, isDeleted: false },
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
          { path: "uomId", select: "name" },
          { path: "purchaseTaxId", select: "name" },
          { path: "salesTaxId", select: "name" },
          { path: "purchaseTaxId", select: "name" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
