import { apiResponse, HTTP_STATUS, USER_ROLES } from "../../common";
import { companyModel, productModel, recipeModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addRecipeSchema, deleteRecipeSchema, editRecipeSchema, getRecipeSchema } from "../../validation";
const ObjectId = require("mongoose").Types.ObjectId;

export const addRecipe = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    let { error, value } = addRecipeSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    const existingRecipe = await getFirstMatch(recipeModel, { companyId: value.companyId, number: value.number, isDeleted: false }, {}, {});

    if (existingRecipe) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Recipe No"), {}, {}));

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

export const getAllRecipe = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page, limit, search, startDate, endDate, activeFilter, companyFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { number: { $regex: search, $options: "si" } }, { type: { $regex: search, $options: "si" } }];
    }

    if (startDate && endDate) {
      criteria.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "rawProducts.productId", select: "name" },
        { path: "finalProducts.productId", select: "name" },
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

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Recipe"), { recipe_data: response, totalData, state: stateObj }, {}));
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
          { path: "rawProducts.productId", select: "name" },
          { path: "finalProducts.productId", select: "name" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Recipe"), {}, {}));

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
    const { search, companyFilter } = req.query;

    let companyId = user?.companyId?._id;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) criteria.companyId = companyId;
    if (companyFilter) criteria.companyId = companyFilter;

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { name: { $regex: search, $options: "si" } }, { number: { $regex: search, $options: "si" } }];
    }

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
