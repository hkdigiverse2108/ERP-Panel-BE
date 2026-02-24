import { apiResponse, HTTP_STATUS } from "../../common";
import { billOfLiveProductModel, productModel, recipeModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addBillOfLiveProductSchema, deleteBillOfLiveProductSchema, editBillOfLiveProductSchema, getBillOfLiveProductSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addBillOfLiveProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = addBillOfLiveProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    const isExist = await getFirstMatch(billOfLiveProductModel, { companyId: value.companyId, number: value.number, isDeleted: false }, {}, {});

    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Bill Of Live Product Number"), {}, {}));

    if (value?.recipeId?.length) {
      for (const recipe of value?.recipeId) {
        if (!(await checkIdExist(recipeModel, recipe, "Recipe", res))) return;
      }
    }

    if (value?.productDetails?.length) {
      for (const product of value?.productDetails) {
        if (!(await checkIdExist(productModel, product?.productId, "Products", res))) return;

        if (product?.ingredients?.length) {
          for (const ingredient of product?.ingredients) {
            if (!(await checkIdExist(productModel, ingredient?.productId, "Ingredient Product", res))) return;
          }
        }
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(billOfLiveProductModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Bill Of Live Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editBillOfLiveProductById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    const { error, value } = editBillOfLiveProductSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    }

    // Check Bill Of Live Product exists
    const isBillExist = await getFirstMatch(billOfLiveProductModel, { _id: value.billOfLiveProductId, isDeleted: false }, {}, {});

    if (!isBillExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Bill Of Live Product"), {}, {}));
    }

    value.companyId = isBillExist.companyId;

    const isNumberExist = await getFirstMatch(
      billOfLiveProductModel,
      {
        companyId: value.companyId,
        number: value.number,
        _id: { $ne: value.billOfLiveProductId },
        isDeleted: false,
      },
      {},
      {},
    );

    if (isNumberExist) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Bill Of Live Product Number"), {}, {}));
    }

    if (value?.recipeId?.length) {
      for (const recipe of value.recipeId) {
        if (!(await checkIdExist(recipeModel, recipe, "Recipe", res))) return;
      }
    }

    if (value?.productDetails?.length) {
      for (const product of value.productDetails) {
        if (!(await checkIdExist(productModel, product?.productId, "Products", res))) return;

        if (product?.ingredients?.length) {
          for (const ingredient of product.ingredients) {
            if (!(await checkIdExist(productModel, ingredient?.productId, "Ingredient Product", res))) return;
          }
        }
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(billOfLiveProductModel, { _id: new ObjectId(value.billOfLiveProductId), isDeleted: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Bill Of Live Product"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Bill Of Live Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteBillOfLiveProductById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deleteBillOfLiveProductSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    }

    const billOfLiveProduct = await getFirstMatch(billOfLiveProductModel, { _id: value.id, isDeleted: false }, {}, {});

    if (!billOfLiveProduct) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Bill Of Live Product"), {}, {}));
    }

    const response = await updateData(billOfLiveProductModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Bill Of Live Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllBillOfLiveProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, startDate, endDate, activeFilter, companyFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.$or = [{ number: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) {
      criteria.isActive = activeFilter === "true";
    }

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
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "recipeId", select: "name" },
        { path: "productDetails.productId", select: "name" },
        { path: "productDetails.ingredients.productId", select: "name" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(billOfLiveProductModel, criteria, {}, options);

    const totalData = await countData(billOfLiveProductModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(
        HTTP_STATUS.OK,
        responseMessage?.getDataSuccess("Bill Of Live Product"),
        {
          billOfLiveProduct_data: response,
          totalData,
          state,
        },
        {},
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getBillOfLiveProductById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getBillOfLiveProductSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    }

    const response = await getFirstMatch(
      billOfLiveProductModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "recipeId", select: "name" },
          {
            path: "productDetails.productId",
            select: "name",
          },
          {
            path: "productDetails.ingredients.productId",
            select: "name",
          },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Bill Of Live Product"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Bill Of Live Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getBillOfLiveProductDropdown = async (req, res) => {
  reqInfo(req);
  try {
    let { user } = req?.headers,
      companyId = user?.companyId?._id;

    const { companyFilter } = req.query;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) criteria.companyId = companyId;
    if (companyFilter) criteria.companyId = companyFilter;

    const response = await getDataWithSorting(
      billOfLiveProductModel,
      criteria,
      { _id: 1, number: 1 },
      {
        sort: { number: 1 },
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      number: item.number,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Bill Of Live Product"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
