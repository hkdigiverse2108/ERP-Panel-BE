import { apiResponse, HTTP_STATUS, USER_ROLES, PREFIX_MODULES } from "../../common";
import { companyModel, productModel, recipeModel } from "../../database";
import { applyDateFilter, checkBranch, checkCompany, checkIdExist, countData, createOne, getAndIncrementPrefix, getDataWithSorting, getFirstMatch, handleIncludeId, reqInfo, responseMessage, updateData, redisGet, redisSet, redisdelPattern } from "../../helper";
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

    await redisdelPattern("recipe:*");
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

    await redisdelPattern("recipe:*");
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

    await redisdelPattern("recipe:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Recipe"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllRecipe = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `recipe:all:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe"), cachedData, {}));

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
        { path: "rawProducts.productId", select: "name" },
        { path: "finalProducts.productId", select: "name" },
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

    const result = { recipe_data: response, totalData, state: stateObj };
    await redisSet(cacheKey, result, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe"), result, {}));
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

    const cacheKey = `recipe:getOne:req:${JSON.stringify(req.params)}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe"), cachedData, {}));

    const response = await getFirstMatch(
      recipeModel,
      { _id: new ObjectId(value.id), isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "rawProducts.productId", select: "name" },
          { path: "finalProducts.productId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Recipe"), {}, {}));

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getRecipeForBOM = async (req, res) => {
  reqInfo(req);
  try {
    const recipeId = req.params.id;
    const cacheKey = `recipe:getBOM:req:${JSON.stringify(req.params)}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe BOM Data"), cachedData, {}));

    const recipe = await getFirstMatch(recipeModel, { _id: new ObjectId(recipeId), isDeleted: false }, {}, {});

    if (!recipe) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Recipe"), {}, {}));

    const finalProducts = await Promise.all(
      recipe.finalProducts.map(async (fp) => {
        const product = await getFirstMatch(productModel, { _id: fp._id, isDeleted: false }, {}, {});
        return {
          itemCode: product?.itemCode || "",
          productId: product?._id,
          productName: product?.name,
          qty: fp.qtyGenerate,
          purchasePrice: product?.purchasePrice || 0,
          landingCost: product?.landingCost || 0,
          mrp: product?.mrp || 0,
          sellingPrice: product?.sellingPrice || 0,
          mfgDate: new Date(),
          expiryDays: product?.expiryDays || 0,
          expiryDate: product?.expiryDays ? new Date(Date.now() + product.expiryDays * 24 * 60 * 60 * 1000) : null,
          batchNo: "",
        };
      }),
    );

    const rawProducts = await Promise.all(
      recipe.rawProducts.map(async (rp) => {
        const product = await getFirstMatch(productModel, { _id: rp.productId, isDeleted: false }, {}, {});
        return {
          itemCode: product?.itemCode || "",
          productId: product?._id,
          productName: product?.name,
          batchNo: "",
          availableQty: product?.availableQty || 0,
          useQty: rp.useQty,
        };
      }),
    );

    const result = {
      recipeId: recipe._id,
      name: recipe.name,
      finalProducts,
      rawProducts,
    };
    await redisSet(cacheKey, result, 3600);

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("Recipe BOM Data"),
        result,
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
    const userType = user?.userType;
    let companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `recipe:dropdown:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe Dropdown"), cachedData, {}));

    const { search, companyFilter, branchFilter, includeId } = req.query;

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

    await redisSet(cacheKey, dropdownData, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};



