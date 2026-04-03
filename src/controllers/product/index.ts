import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { branchModel, companyModel, productModel, productTypeModel, stockModel, uomModel, brandModel, categoryModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, findAllAndPopulateWithSorting, extractDataFromFile } from "../../helper";
import { addBulkProductSchema, addProductSchema, deleteProductSchema, editProductSchema, getProductSchema } from "../../validation";
import axios from "axios";
import FormData from "form-data";

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
    if (value?.productTypeId && !(await checkIdExist(productTypeModel, value?.productTypeId, "Product Type", res))) return;

    let duplicateCriteria: any = { name: value?.name, isDeleted: false };
    if (value?.companyId) duplicateCriteria.companyId = value.companyId;
    let isExist = await getFirstMatch(productModel, duplicateCriteria, {}, {});

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

export const bulkAddProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    const companyId = userType !== USER_TYPES.SUPER_ADMIN ? user?.companyId?._id : null;

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("File"), {}, {}));
    }

    const { data, error: extractError } = extractDataFromFile(req.file);
    if (extractError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, extractError, {}, {}));
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No data found in the file", {}, {}));
    }

    const productsToAdd = [];
    const errors = [];
    const namesInFile = new Set();

    for (let i = 0; i < data.length; i++) {
      let item = data[i];

      // --- Pre-process the item ---

      // 1. Handle booleans string (TRUE/FALSE)
      Object.keys(item).forEach((key) => {
        if (typeof item[key] === "string") {
          const val = item[key].trim().toUpperCase();
          if (val === "TRUE") item[key] = true;
          else if (val === "FALSE") item[key] = false;
        }
      });

      // 2. Handle productType string (convert to enum format: lowercase and underscores)
      if (item.productType && typeof item.productType === "string") {
        item.productType = item.productType.trim().toLowerCase().replace(/\s+/g, "_");
      }

      // 3. Handle date strings (DD-MM-YYYY or DD/MM/YYYY to Date object)
      if (item.expiryReferenceDate && typeof item.expiryReferenceDate === "string") {
        const dateStr = item.expiryReferenceDate.trim();
        const dateParts = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dateParts) {
          const day = parseInt(dateParts[1], 10);
          const month = parseInt(dateParts[2], 10) - 1;
          const year = parseInt(dateParts[3], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            item.expiryReferenceDate = date;
          }
        }
      }

      // Validate with Joi
      let { error, value } = addBulkProductSchema.validate(item);

      if (error) {
        errors.push({ row: i + 1, error: error.details[0].message });
        continue;
      }

      // --- Post-validation processing ---

      // 1. Handle ingredients (comma-separated string to array)
      if (value.ingredients && typeof value.ingredients === "string") {
        value.ingredients = value.ingredients
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
      }

      // 2. Handle nutrition (string like 'item1:value1, item2:value2' to array of objects)
      if (value.nutrition && typeof value.nutrition === "string") {
        const nutritionArray = [];
        const pairs = value.nutrition.split(",").map((p) => p.trim()).filter((p) => p !== "");
        for (const pair of pairs) {
          const parts = pair.split(":");
          const name = parts[0]?.trim() || "";
          const val = parts.slice(1).join(":")?.trim() || ""; // In case the value contains a colon
          if (name || val) {
            nutritionArray.push({
              name: name,
              value: val,
            });
          }
        }
        value.nutrition = nutritionArray;
      }

      if (userType !== USER_TYPES.SUPER_ADMIN) {
        value.companyId = companyId;
      }

      // --- Map names to IDs ---

      // Category & SubCategory Mapping
      if (value.category) {
        const categoryResult = await getFirstMatch(categoryModel, { name: { $regex: new RegExp(`^${value.category.trim()}$`, "i") }, isDeleted: false, parentCategoryId: null }, {}, {});
        if (!categoryResult) {
          errors.push({ row: i + 1, error: `Category '${value.category}' not found` });
          continue;
        }
        value.categoryId = categoryResult._id;

        if (value.subCategory) {
          const subCategoryResult = await getFirstMatch(categoryModel, { name: { $regex: new RegExp(`^${value.subCategory.trim()}$`, "i") }, isDeleted: false, parentCategoryId: value.categoryId }, {}, {});
          if (!subCategoryResult) {
            errors.push({ row: i + 1, error: `Sub-category '${value.subCategory}' not found under '${value.category}'` });
            continue;
          }
          value.subCategoryId = subCategoryResult._id;
        }
      }

      // Brand & SubBrand Mapping
      if (value.brand) {
        const brandResult = await getFirstMatch(brandModel, { name: { $regex: new RegExp(`^${value.brand.trim()}$`, "i") }, isDeleted: false, parentBrandId: null }, {}, {});
        if (!brandResult) {
          errors.push({ row: i + 1, error: `Brand '${value.brand}' not found` });
          continue;
        }
        value.brandId = brandResult._id;

        if (value.subBrand) {
          const subBrandResult = await getFirstMatch(brandModel, { name: { $regex: new RegExp(`^${value.subBrand.trim()}$`, "i") }, isDeleted: false, parentBrandId: value.brandId }, {}, {});
          if (!subBrandResult) {
            errors.push({ row: i + 1, error: `Sub-brand '${value.subBrand}' not found under '${value.brand}'` });
            continue;
          }
          value.subBrandId = subBrandResult._id;
        }
      }

      const nameKey = value.companyId ? `${value.name}_${value.companyId}` : value.name;
      if (namesInFile.has(nameKey)) {
        errors.push({ row: i + 1, error: `Duplicate Product Name in file: ${value.name}` });
        continue;
      }
      namesInFile.add(nameKey);

      if (value.companyId && !(await checkIdExist(companyModel, value.companyId, "Company", null))) {
        errors.push({ row: i + 1, error: responseMessage?.getDataNotFound("Company") });
        continue;
      }

      if (value.branchId && !(await checkIdExist(branchModel, value.branchId, "Branch", null))) {
        errors.push({ row: i + 1, error: responseMessage?.getDataNotFound("Branch") });
        continue;
      }

      if (value?.productTypeId && !(await checkIdExist(productTypeModel, value?.productTypeId, "Product Type", null))) {
        errors.push({ row: i + 1, error: responseMessage?.getDataNotFound("Product Type") });
        continue;
      }

      let duplicateCriteria: any = { name: value?.name, isDeleted: false };
      if (value?.companyId) duplicateCriteria.companyId = value.companyId;
      let isExist = await getFirstMatch(productModel, duplicateCriteria, {}, {});
      if (isExist) {
        errors.push({ row: i + 1, error: responseMessage?.dataAlreadyExist("Product with this name") });
        continue;
      }

      value.createdBy = user?._id || null;
      value.updatedBy = user?._id || null;

      // Clean up the string fields used for mapping before saving to DB
      delete value.category;
      delete value.subCategory;
      delete value.brand;
      delete value.subBrand;

      productsToAdd.push(value);
    }

    if (errors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Bulk upload failed due to some errors.", {}, { errors }));
    }

    const response = await productModel.insertMany(productsToAdd);
    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Bulk Products"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userType = user?.userType;
    const userCompanyId = user?.companyId?._id;

    const { error, value } = editProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const companyId = value?.companyId || userCompanyId;

    if (companyId && !(await checkIdExist(companyModel, companyId, "Company", res))) return;

    if (value?.branchId && !(await checkIdExist(branchModel, value?.branchId, "Branch", res))) return;

    if (value?.productTypeId && !(await checkIdExist(productTypeModel, value?.productTypeId, "Product Type", res))) return;

    let isExist = await getFirstMatch(productModel, { _id: value?.productId, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    // Ownership check: non-super-admin can only edit their own company's products
    if (userType !== USER_TYPES.SUPER_ADMIN && userCompanyId) {
      const productCompanyId = isExist?.companyId?.toString();
      if (productCompanyId && productCompanyId !== userCompanyId.toString()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Product"), {}, {}));
      }
    }

    // Duplicate name check scoped to company
    let duplicateCriteria: any = { isDeleted: false, name: value?.name, _id: { $ne: value?.productId } };
    if (companyId) duplicateCriteria.companyId = companyId;
    isExist = await getFirstMatch(productModel, duplicateCriteria, {}, {});

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
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { error, value } = deleteProductSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isExist = await getFirstMatch(productModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {}));

    // Ownership check: non-super-admin can only delete their own company's products
    if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
      const productCompanyId = isExist?.companyId?.toString();
      if (productCompanyId && productCompanyId !== companyId.toString()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Product"), {}, {}));
      }
    }

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
    const { page, limit, search, startDate, endDate, activeFilter, companyFilter, categoryFilter, subCategoryFilter, brandFilter, subBrandFilter, hsnCodeFilter, purchaseTaxFilter, salesTaxIdFilter, productTypeFilter, productTypeIdFilter } = req.query;
    const effectiveCompanyId = companyFilter || (userType !== USER_TYPES.SUPER_ADMIN ? companyId : null);

    let criteria: any = { isDeleted: false };

    // Company scoping: company users see their own products + super admin products (companyId is null)
    // if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
    //   criteria.$or = [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }];
    // } else if (userType === USER_TYPES.SUPER_ADMIN && companyFilter) {
    //   criteria.$or = [{ companyId: companyFilter }, { companyId: null }, { companyId: { $exists: false } }];
    // }

    if (search) {
      const searchCriteria = [{ name: { $regex: search, $options: "si" } }];
      if (criteria.$or) {
        criteria.$and = [{ $or: criteria.$or }, { $or: searchCriteria }];
        delete criteria.$or;
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

    if (productTypeIdFilter) criteria.productTypeId = new ObjectId(productTypeIdFilter);

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
        companyId: new ObjectId(companyFilter as string),
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
        { path: "productTypeId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
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
          if (effectiveCompanyId) {
            stockCriteria.companyId = new ObjectId(effectiveCompanyId.toString());
          }
        } else {
          stockCriteria.productId = product._id;
          if (effectiveCompanyId) {
            stockCriteria.companyId = new ObjectId(effectiveCompanyId.toString());
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
              purchaseTaxId: { $first: "$purchaseTaxId" },
              salesTaxId: { $first: "$salesTaxId" },
              isPurchaseTaxIncluding: { $first: "$isPurchaseTaxIncluding" },
              isSalesTaxIncluding: { $first: "$isSalesTaxIncluding" },
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
            $lookup: {
              from: "taxes",
              localField: "purchaseTaxId",
              foreignField: "_id",
              as: "purchaseTaxData",
            },
          },
          {
            $lookup: {
              from: "taxes",
              localField: "salesTaxId",
              foreignField: "_id",
              as: "salesTaxData",
            },
          },
          {
            $unwind: {
              path: "$uomData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$purchaseTaxData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$salesTaxData",
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
              purchaseTaxData: {
                _id: "$purchaseTaxData._id",
                name: "$purchaseTaxData.name",
                percentage: "$purchaseTaxData.percentage",
              },
              salesTaxData: {
                _id: "$salesTaxData._id",
                name: "$salesTaxData.name",
                percentage: "$salesTaxData.percentage",
              },
              totalQty: 1,
              totalMrp: 1,
              totalSellingPrice: 1,
              totalSellingDiscount: 1,
              totalLandingCost: 1,
              totalPurchasePrice: 1,
              totalSellingMargin: 1,
              isPurchaseTaxIncluding: 1,
              isSalesTaxIncluding: 1,
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
          purchaseTaxId: stockAggregation.length > 0 ? stockAggregation[0].purchaseTaxData : null,
          salesTaxId: stockAggregation.length > 0 ? stockAggregation[0].salesTaxData : null,
          isPurchaseTaxIncluding: stockAggregation.length > 0 ? stockAggregation[0].isPurchaseTaxIncluding : false,
          isSalesTaxIncluding: stockAggregation.length > 0 ? stockAggregation[0].isSalesTaxIncluding : false,
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
    let { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;

    const { productType, search, companyFilter, categoryFilter, brandFilter, isNewProduct, stockFilter } = req.query;

    // Determine the effective company ID for filtering
    let effectiveCompanyId = companyId;
    if (companyFilter && userType === USER_TYPES.SUPER_ADMIN) {
      effectiveCompanyId = new ObjectId(companyFilter as string);
    }

    // --- Stock filtering (only when NOT a new product) ---
    let productIdsWithStock: string[] = [];
    const stockByProductId = new Map<string, any>();

    if (isNewProduct !== "true") {
      let stockCriteria: any = { isDeleted: false, isActive: true };

      if (effectiveCompanyId) stockCriteria.companyId = effectiveCompanyId;

      if (stockFilter === "true") {
        stockCriteria.qty = { $gt: 0 };
      }

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

    // --- Product filtering ---
    let criteria: any = {
      isDeleted: false,
      isActive: true,
    };

    // Company scoping: company users see their own products + super admin products (companyId is null)
    if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
      criteria.$or = [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }];
    } else if (userType === USER_TYPES.SUPER_ADMIN && companyFilter) {
      criteria.$or = [{ companyId: companyFilter }, { companyId: null }, { companyId: { $exists: false } }];
    }

    if (isNewProduct !== "true" && productIdsWithStock.length > 0) {
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
      const searchCondition = [{ name: { $regex: search, $options: "si" } }];
      if (criteria.$or) {
        criteria.$and = [{ $or: criteria.$or }, { $or: searchCondition }];
        delete criteria.$or;
      } else {
        criteria.$or = searchCondition;
      }
    }

    const response = await getDataWithSorting(
      productModel,
      criteria,
      { _id: 1, name: 1, productType: 1, mrp: 1, sellingDiscount: 1, sellingPrice: 1, sellingMargin: 1, landingCost: 1, purchasePrice: 1, images: 1 },
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
        images: product.images ?? [],
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
      {
        _id: value?.id,
        isDeleted: false,
        ...(userType !== USER_TYPES.SUPER_ADMIN && companyId
          ? { $or: [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }] }
          : {}),
      },
      {},
      {
        populate: [
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
          { path: "brandId", select: "name" },
          { path: "subBrandId", select: "name" },
          { path: "productTypeId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
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

export const detectProduct = async (req, res) => {
  reqInfo(req);
  try {
    let files = req.files ? (req.files as any[]) : [];
    if (!files || files.length === 0) {
      if (req.file) {
        files = [req.file];
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "At least one image file is required", {}, {}));
      }
    }

    const { user } = req.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    let skuMatchesDetailsArray = [];

    // 1. Prepare Base64 Image
    const firstFile = files[0];
    const imageBase64 = firstFile.buffer.toString("base64");

    // 2. Call Internal AI Analyze API
    let results: any[] = [];
    let idMatches: Record<string, number> = {};
    let idCounts: Record<string, number> = {};

    try {
      const backendUrl = process.env.BACKEND_URL || "http://localhost:4001";
      const authHeader = req.headers.authorization;

      const aiApiResponse = await axios.post(`${backendUrl}/ai/analyze`, 
        { imageBase64 }, 
        { headers: { Authorization: authHeader } }
      );

      const aiItems = aiApiResponse.data?.data || [];
      console.log("aiItems => ",aiItems);
      
      const unmatchedItems = [];

      // 3. Map AI Results to Product ID context
      aiItems.forEach((item: any) => {
          if (item.matched && item.product_id) {
              const productId = item.product_id;
              idMatches[productId] = 0.95; 
              idCounts[productId] = (idCounts[productId] || 0) + (item.quantity || 1);
          } else {
              unmatchedItems.push(item);
          }
      });

      results = [{ image: firstFile.originalname, items_count: aiItems.length, unmatched_items: unmatchedItems }];

      // 4. Data Hydration (Stock Lookups)
      const matchedIds = Object.keys(idMatches);
      if (matchedIds.length > 0) {
        let criteria: any = { isDeleted: false, _id: { $in: matchedIds }, isActive: true };
        
        // Ownership check for products
        if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
          criteria.$or = [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }];
        }
        console.log("criteria => ",criteria);
        const enrichedProducts = await findAllAndPopulateWithSorting(productModel, criteria, {}, {}, [
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
          { path: "brandId", select: "name" },
          { path: "subBrandId", select: "name" },
        ]);
        console.log("enrichedProducts => ",enrichedProducts);
        skuMatchesDetailsArray = await Promise.all(
          enrichedProducts.map(async (product: any) => {
            const productObj = product.toObject ? product.toObject() : product;
            const productIdStr = product._id.toString();
            const stockCriteria: any = { isDeleted: false, productId: product._id };
            if (companyId) stockCriteria.companyId = new ObjectId(companyId.toString());

            // Pull first available stock for this item
            const stockInfo = await stockModel.findOne(stockCriteria).populate([
                { path: "purchaseTaxId", select: "name percentage" },
                { path: "salesTaxId", select: "name percentage" },
                { path: "uomId", select: "name code" }
            ]);

            return {
              ...productObj,
              mrp: stockInfo?.mrp || productObj.mrp || 0,
              sellingPrice: stockInfo?.sellingPrice || productObj.sellingPrice || 0,
              sellingDiscount: stockInfo?.sellingDiscount || 0,
              qty: stockInfo?.qty || 0,
              uomId: stockInfo?.uomId || null,
              purchaseTaxId: stockInfo?.purchaseTaxId || null,
              salesTaxId: stockInfo?.salesTaxId || null,
              ai_confidence: idMatches[productIdStr] || 0,
              detect_qty: idCounts[productIdStr] || 1
            };
          })
        );
      }
    } catch (err: any) {
      console.error("Internal AI Delegation error:", err?.response?.data || err?.message);
      results = [{ success: false, message: "Detection service temporarily unavailable" }];
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Products detected successfully", { results, sku_matches_details: skuMatchesDetailsArray }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
  }
};

// export const detectProduct = async (req, res) => {
//   reqInfo(req);
//   try {
//     let files = req.files ? (req.files as any[]) : [];
//     if (!files || files.length === 0) {
//       if (req.file) {
//         files = [req.file];
//       } else {
//         return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "At least one image file is required", {}, {}));
//       }
//     }

//     const { user } = req.headers;
//     const userType = user?.userType;
//     const companyId = user?.companyId?._id;
//     let skuMatchesDetailsArray = [];

//     const formData = new FormData();
//     for (const file of files) {
//       formData.append("image", file.buffer, {
//         filename: file.originalname,
//         contentType: file.mimetype,
//       });
//     }

//     let results: any[] = [];

//     try {
//       const aiResponse = await axios.post("https://train-product.ai-setu.cloud/api/scanimg", formData, {
//         headers: { ...formData.getHeaders() },
//         timeout: 60000,
//       });

//       let responseData = aiResponse?.data || {};
//       let rootData = responseData;

//       if (Array.isArray(responseData)) {
//         rootData = responseData[0] || {};
//       } else if (Array.isArray(responseData.data)) {
//         rootData = responseData.data[0] || {};
//       } else if (responseData.data) {
//         rootData = responseData.data;
//       }

//       let skuMatches: Record<string, number> = {};
//       let skuCounts: Record<string, number> = {};

//       if (rootData.results && Array.isArray(rootData.results)) {
//         for (const item of rootData.results) {
//           if (item.response) {
//             const itemSkuMatches = item.response.sku_matches || {};
//             for (const [sku, conf] of Object.entries(itemSkuMatches)) {
//               skuMatches[sku] = Math.max(skuMatches[sku] || 0, conf as number);
//             }

//             const itemDetections = item.response.detections || [];
//             for (const det of itemDetections) {
//               if (det.matched_sku) {
//                 skuCounts[det.matched_sku] = (skuCounts[det.matched_sku] || 0) + 1;
//               }
//             }
//           }
//         }
//       } else {
//         const itemSkuMatches = rootData.sku_matches || {};
//         for (const [sku, conf] of Object.entries(itemSkuMatches)) {
//           skuMatches[sku] = conf as number;
//         }

//         if (rootData.sku_counts) {
//           skuCounts = rootData.sku_counts;
//         } else {
//           const itemDetections = rootData.detections || [];
//           for (const det of itemDetections) {
//             if (det.matched_sku) {
//               skuCounts[det.matched_sku] = (skuCounts[det.matched_sku] || 0) + 1;
//             }
//           }
//         }
//       }

//       const matchedSkus = Object.keys(skuMatches);

//       let products: any[] = [];
//       let productsWithStock: any[] = [];
//       const effectiveCompanyId = companyId || null;

//       if (matchedSkus.length > 0) {
//         let criteria: any = {
//           isDeleted: false,
//           sku: { $in: matchedSkus },
//           isActive: true,
//         };

//         if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
//           criteria.$or = [{ companyId: companyId }, { companyId: null }, { companyId: { $exists: false } }];
//         }

//         let populate = [
//           { path: "categoryId", select: "name" },
//           { path: "subCategoryId", select: "name" },
//           { path: "brandId", select: "name" },
//           { path: "subBrandId", select: "name" },
//         ];
//         products = await findAllAndPopulateWithSorting(
//           productModel,
//           criteria,
//           {},
//           {},
//           populate
//         );

//         productsWithStock = await Promise.all(
//           products.map(async (product: any) => {
//             const productObj = product.toObject ? product.toObject() : product;
//             const linkedStockIds = (productObj.stockIds || []).filter((id: any) => id);

//             let stockCriteria: any = { isDeleted: false };

//             if (linkedStockIds.length > 0) {
//               stockCriteria._id = { $in: linkedStockIds.map((id: any) => new ObjectId(id.toString())) };
//               if (effectiveCompanyId) {
//                 stockCriteria.companyId = new ObjectId(effectiveCompanyId.toString());
//               }
//             } else {
//               stockCriteria.productId = product._id;
//               if (effectiveCompanyId) {
//                 stockCriteria.companyId = new ObjectId(effectiveCompanyId.toString());
//               }
//             }

//             const stockAggregation = await stockModel.aggregate([
//               { $match: stockCriteria },
//               {
//                 $lookup: {
//                   from: "taxes",
//                   localField: "purchaseTaxId",
//                   foreignField: "_id",
//                   as: "purchaseTax",
//                 },
//               },
//               {
//                 $unwind: {
//                   path: "$purchaseTax",
//                   preserveNullAndEmptyArrays: true,
//                 },
//               },
//               {
//                 $lookup: {
//                   from: "taxes",
//                   localField: "salesTaxId",
//                   foreignField: "_id",
//                   as: "salesTax",
//                 },
//               },
//               {
//                 $unwind: {
//                   path: "$salesTax",
//                   preserveNullAndEmptyArrays: true,
//                 },
//               },
//               {
//                 $lookup: {
//                   from: "uoms",
//                   localField: "uomId",
//                   foreignField: "_id",
//                   as: "uomData",
//                 },
//               },
//               {
//                 $unwind: {
//                   path: "$uomData",
//                   preserveNullAndEmptyArrays: true,
//                 },
//               },
//               {
//                 $project: {
//                   _id: 0,
//                   qty: 1,
//                   mrp: 1,
//                   sellingPrice: 1,
//                   sellingDiscount: 1,
//                   landingCost: 1,
//                   purchasePrice: 1,
//                   sellingMargin: 1,
//                   isPurchaseTaxIncluding: 1,
//                   isSalesTaxIncluding: 1,
//                   purchaseTaxId: {
//                     _id: "$purchaseTax._id",
//                     name: "$purchaseTax.name",
//                     percentage: "$purchaseTax.percentage",
//                   },
//                   salesTaxId: {
//                     _id: "$salesTax._id",
//                     name: "$salesTax.name",
//                     percentage: "$salesTax.percentage",
//                   },
//                   uomData: {
//                     _id: "$uomData._id",
//                     name: "$uomData.name",
//                     code: "$uomData.code",
//                   },
//                 },
//               },
//               { $limit: 1 }
//             ]);

//             const stockInfo = stockAggregation.length > 0 ? stockAggregation[0] : null;

//             return {
//               ...productObj,
//               mrp: stockInfo ? stockInfo.mrp : (productObj.mrp || 0),
//               sellingPrice: stockInfo ? stockInfo.sellingPrice : (productObj.sellingPrice || 0),
//               sellingDiscount: stockInfo ? stockInfo.sellingDiscount : (productObj.sellingDiscount || 0),
//               landingCost: stockInfo ? stockInfo.landingCost : (productObj.landingCost || 0),
//               purchasePrice: stockInfo ? stockInfo.purchasePrice : (productObj.purchasePrice || 0),
//               sellingMargin: stockInfo ? stockInfo.sellingMargin : (productObj.sellingMargin || 0),
//               qty: stockInfo ? stockInfo.qty : 0,
//               uomId: stockInfo ? stockInfo.uomData : null,
//               purchaseTaxId: (stockInfo && stockInfo.purchaseTaxId && stockInfo.purchaseTaxId._id) ? stockInfo.purchaseTaxId : null,
//               salesTaxId: (stockInfo && stockInfo.salesTaxId && stockInfo.salesTaxId._id) ? stockInfo.salesTaxId : null,
//               isPurchaseTaxIncluding: stockInfo ? stockInfo.isPurchaseTaxIncluding : false,
//               isSalesTaxIncluding: stockInfo ? stockInfo.isSalesTaxIncluding : false,
//             };
//           }),
//         );
//       }

//       skuMatchesDetailsArray = productsWithStock.map((p: any) => ({
//         ...p,
//         ai_confidence: skuMatches[p.sku] || 0,
//         detect_qty: skuCounts[p.sku] || 1
//       }));

//       // Return unified results block
//       results = [{
//         ...rootData,
//       }];
//     } catch (err: any) {
//       console.error("Error processing batch image detection", err?.message);
//       results = [{
//         success: false,
//         message: err?.message || "Detection failed for batch images",
//       }];
//     }

//     return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, (responseMessage as any)?.getDataSuccess?.("AI Detections") || "Products detected successfully", { results, sku_matches_details: skuMatchesDetailsArray || [] }, {}));
//   } catch (error) {
//     console.error(error);
//     return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, (responseMessage as any)?.internalServerError || "Internal server error", {}, error));
//   }
// };