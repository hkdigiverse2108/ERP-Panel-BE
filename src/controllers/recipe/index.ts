import { apiResponse, HTTP_STATUS, USER_ROLES, PREFIX_MODULES } from "../../common";
import { companyModel, productModel, recipeModel, stockModel } from "../../database";
import { applyDateFilter, checkBranch, checkCompany, checkIdExist, countData, createOne, getAndIncrementPrefix, getDataWithSorting, getFirstMatch, handleIncludeId, reqInfo, responseMessage, updateData } from "../../helper";
import { addRecipeSchema, deleteRecipeSchema, editRecipeSchema, getRecipeSchema } from "../../validation";
const ObjectId = require("mongoose").Types.ObjectId;

export const addRecipe = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    let { error, value } = addRecipeSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));

    value.number = await getAndIncrementPrefix({
      branchId: value.branchId,
      companyId: value.companyId,
      prefixType: PREFIX_MODULES.RECIPE,
      model: recipeModel,
      fieldName: "number",
    });


    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(recipeModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Recipe"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editRecipeById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    let { error, value } = editRecipeSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    if (value?.companyId && !(await checkIdExist(companyModel, value?.companyId, "Company", res))) return;

    const existingRecipe = await getFirstMatch(recipeModel, { companyId: value.companyId, number: value.number, isDeleted: false, _id: { $ne: value?.recipeId } }, {}, {});

    if (existingRecipe) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Recipe No"), {}, {}));

    value.updatedBy = user?._id || null;

    const response = await updateData(recipeModel, { _id: new ObjectId(value.recipeId), isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Recipe"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Recipe"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteRecipeById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = deleteRecipeSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const isRecipeExist = await getFirstMatch(recipeModel, { _id: new ObjectId(value.id), isDeleted: false }, {}, {});

    if (!isRecipeExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Recipe"), {}, {}));

    const response = await updateData(recipeModel, { _id: new ObjectId(value.id) }, { isDeleted: true, updatedBy: user?._id || null }, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Recipe"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Recipe"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

const formatRecipe = (recipe: any) => {
  const recObj = recipe.toObject ? recipe.toObject() : recipe;
  if (recObj.rawProducts) {
    recObj.rawProducts = recObj.rawProducts.map((item: any) => {
      const product = item.productId;
      if (product && product._id) {
        const matchedVariant = item.variantId
          ? (product.variants || []).find((v: any) => v._id.toString() === item.variantId.toString())
          : null;

        const updatedProduct = {
          ...product,
          variantId: item.variantId || null,
        };

        if (matchedVariant) {
          item.variant = matchedVariant;
          updatedProduct.name = `${product.name} - ${matchedVariant.name}`;
          if (matchedVariant.sku) updatedProduct.sku = matchedVariant.sku;
          if (matchedVariant.itemCode) updatedProduct.itemCode = matchedVariant.itemCode;
          if (matchedVariant.barcode) updatedProduct.barcode = matchedVariant.barcode;
          if (matchedVariant.barcodeType) updatedProduct.barcodeType = matchedVariant.barcodeType;
          updatedProduct.isActive = matchedVariant.isActive ?? updatedProduct.isActive;
          if (matchedVariant.attributes) updatedProduct.attributes = matchedVariant.attributes;
          updatedProduct.variants = [matchedVariant];
        } else {
          updatedProduct.variants = [];
        }
        item.productId = updatedProduct;
      }
      return item;
    });
  }
  if (recObj.finalProducts) {
    const product = recObj.finalProducts.productId;
    if (product && product._id) {
      const matchedVariant = recObj.finalProducts.variantId
        ? (product.variants || []).find((v: any) => v._id.toString() === recObj.finalProducts.variantId.toString())
        : null;

      const updatedProduct = {
        ...product,
        variantId: recObj.finalProducts.variantId || null,
      };

      if (matchedVariant) {
        recObj.finalProducts.variant = matchedVariant;
        updatedProduct.name = `${product.name} - ${matchedVariant.name}`;
        if (matchedVariant.sku) updatedProduct.sku = matchedVariant.sku;
        if (matchedVariant.itemCode) updatedProduct.itemCode = matchedVariant.itemCode;
        if (matchedVariant.barcode) updatedProduct.barcode = matchedVariant.barcode;
        if (matchedVariant.barcodeType) updatedProduct.barcodeType = matchedVariant.barcodeType;
        updatedProduct.isActive = matchedVariant.isActive ?? updatedProduct.isActive;
        if (matchedVariant.attributes) updatedProduct.attributes = matchedVariant.attributes;
        updatedProduct.variants = [matchedVariant];
      } else {
        updatedProduct.variants = [];
      }
      recObj.finalProducts.productId = updatedProduct;
    }
  }
  return recObj;
};

export const getAllRecipe = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    let { page, limit, search, startDate, endDate, activeFilter, companyFilter, branchFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = new ObjectId(companyId);
    }

    if (companyFilter) {
      criteria.companyId = new ObjectId(companyFilter);
    }

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (branchFilter) {
      criteria.branchId = branchFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { number: { $regex: search, $options: "si" } }, { type: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "rawProducts.productId", select: "name sku itemCode barcode variants" },
        { path: "finalProducts.productId", select: "name sku itemCode barcode variants" },
        { path: "createdBy", select: "fullName userType" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(recipeModel, criteria, {}, options);

    const totalData = await countData(recipeModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
    };

    const formattedResponse = response.map(formatRecipe);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe"), { recipe_data: formattedResponse, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getRecipeById = async (req, res) => {
  reqInfo(req);
  try {
    let { error, value } = getRecipeSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await getFirstMatch(
      recipeModel,
      { _id: new ObjectId(value.id), isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "rawProducts.productId", select: "name sku itemCode barcode variants" },
          { path: "finalProducts.productId", select: "name sku itemCode barcode variants" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Recipe"), {}, {}));

    const formattedResponse = formatRecipe(response);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe"), formattedResponse, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getRecipeForBOM = async (req, res) => {
  reqInfo(req);
  try {
    const recipeId = req.params.id;
    const { user } = req?.headers;

    const recipe = await getFirstMatch(recipeModel, { _id: new ObjectId(recipeId), isDeleted: false }, {}, {});

    if (!recipe) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Recipe"), {}, {}));

    const branchId = user?.branchId?._id || user?.branchId || recipe.branchId;

    const fp = recipe.finalProducts;
    let finalProducts: any[] = [];
    if (fp && fp.productId) {
      const product = await getFirstMatch(productModel, { _id: fp.productId, isDeleted: false }, {}, {});
      if (product) {
        let name = product.name;
        let itemCode = product.itemCode || "";
        let purchasePrice = product.purchasePrice || 0;
        let landingCost = product.landingCost || 0;
        let mrp = fp.mrp || product.mrp || 0;
        let sellingPrice = product.sellingPrice || 0;

        if (fp.variantId) {
          const variant = product.variants?.find((v: any) => v._id.toString() === fp.variantId.toString());
          if (variant) {
            name = `${product.name} - ${variant.name}`;
            itemCode = variant.itemCode || product.itemCode || "";
            purchasePrice = variant.purchasePrice || product.purchasePrice || 0;
            mrp = fp.mrp || variant.mrp || product.mrp || 0;
            sellingPrice = variant.sellingPrice || product.sellingPrice || 0;
          }
        }

        finalProducts.push({
          itemCode,
          productId: product._id,
          variantId: fp.variantId || null,
          productName: name,
          qty: fp.qtyGenerate,
          purchasePrice,
          landingCost,
          mrp,
          sellingPrice,
          mfgDate: new Date(),
          expiryDays: product.expiryDays || 0,
          expiryDate: product.expiryDays ? new Date(Date.now() + product.expiryDays * 24 * 60 * 60 * 1000) : null,
          batchNo: "",
        });
      }
    }

    const rawProducts = await Promise.all(
      (recipe.rawProducts || []).map(async (rp) => {
        const product = await getFirstMatch(productModel, { _id: rp.productId, isDeleted: false }, {}, {});
        let name = product?.name || "";
        let itemCode = product?.itemCode || "";

        if (rp.variantId && product) {
          const variant = product.variants?.find((v: any) => v._id.toString() === rp.variantId.toString());
          if (variant) {
            name = `${product.name} - ${variant.name}`;
            itemCode = variant.itemCode || product.itemCode || "";
          }
        }

        const stockFilter: any = { productId: rp.productId, isDeleted: false };
        if (branchId) {
          stockFilter.branchId = branchId;
        }

        if (rp.variantId) {
          stockFilter.variantId = rp.variantId;
        } else {
          stockFilter.variantId = { $exists: false };
        }

        const stock = await getFirstMatch(stockModel, stockFilter, {}, {});
        const availableQty = stock ? stock.qty : 0;

        return {
          itemCode,
          productId: product?._id,
          variantId: rp.variantId || null,
          productName: name,
          batchNo: "",
          availableQty,
          useQty: rp.useQty,
        };
      }),
    );

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("Recipe BOM Data"),
        {
          recipeId: recipe._id,
          name: recipe.name,
          finalProducts,
          rawProducts,
        },
        {},
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getRecipeDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { search, companyFilter, branchFilter, includeId } = req.query;

    let companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) criteria.companyId = companyId;
    if (companyFilter) criteria.companyId = companyFilter;

    if (branchId) criteria.branchId = branchId;
    if (branchFilter) criteria.branchId = branchFilter;

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { name: { $regex: search, $options: "si" } }, { number: { $regex: search, $options: "si" } }];
    }

    criteria = handleIncludeId(criteria, includeId);

    const response = await getDataWithSorting(
      recipeModel,
      criteria,
      { name: 1, number: 1 },
      {
        sort: { name: 1 },
        limit: search ? 50 : 1000,
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      number: item.number,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};



