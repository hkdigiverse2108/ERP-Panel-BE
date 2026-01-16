import { HTTP_STATUS, USER_ROLES } from "../../common";
import { apiResponse } from "../../common/utils";
import { billOfLiveProductModel, brandModel, companyModel, productModel, recipeModel } from "../../database/model";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addBillOfLiveProductSchema, addBrandSchema, deleteBrandSchema, editBillOfLiveProductSchema, editBrandSchema, getBrandSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addBillOfLiveProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const userRole = user?.role?.name;

    const { error, value } = addBillOfLiveProductSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    if (userRole !== USER_ROLES.SUPER_ADMIN) {
      value.companyId = user?.companyId?._id;
    }
    if (!value?.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));

    if (value?.companyId && !(await checkIdExist(companyModel, value?.companyId, "Company", res))) return;

    const isExist = await getFirstMatch(billOfLiveProductModel, { companyId: value.companyId, number: value.number, isDeleted: false }, {}, {});

    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Bill Of Live Product Number"), {}, {}));

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
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage.addDataSuccess("Bill Of Live Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const editBillOfLiveProductById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = editBillOfLiveProductSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));
    }

    const isBillExist = await getFirstMatch(billOfLiveProductModel, { _id: value.billOfLiveProductId, isDeleted: false }, {}, {});

    if (!isBillExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Bill Of Live Product"), {}, {}));
    }

    const isNumberExist = await getFirstMatch(
      billOfLiveProductModel,
      {
        companyId: value.companyId,
        number: value.number,
        _id: { $ne: value.billOfLiveProductId },
        isDeleted: false,
      },
      {},
      {}
    );

    if (isNumberExist) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Bill Of Live Product Number"), {}, {}));
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
    if (companyId) value.companyId = companyId;

    const response = await updateData(billOfLiveProductModel, { _id: new ObjectId(value.billOfLiveProductId), isDeleted: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage.updateDataError("Bill Of Live Product"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.updateDataSuccess("Bill Of Live Product"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

// export const editBillOfLiveProductById = async (req, res) => {
//   reqInfo(req);
//   try {
//     const user = req.headers;
//     const { error, value } = editBrandSchema.validate(req.body);

//     if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

//     const isExist = await getFirstMatch(brandModel, { code: value.code, _id: { $ne: value.brandId }, isDeleted: false }, {}, {});

//     if (isExist) {
//       return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Brand code"), {}, {}));
//     }

//     value.updatedBy = user?._id || null;

//     const response = await updateData(brandModel, { _id: new ObjectId(value.brandId), isDeleted: false }, value, {});

//     if (!response) {
//       return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage.updateDataError("Brand"), {}, {}));
//     }

//     return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.updateDataSuccess("Brand"), response, {}));
//   } catch (error) {
//     console.error(error);
//     return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
//   }
// };

export const deleteBillOfLiveProductById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = deleteBrandSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const brand = await getFirstMatch(brandModel, { _id: value.id, isDeleted: false }, {}, {});

    if (!brand) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Brand"), {}, {}));
    }

    const response = await updateData(brandModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.deleteDataSuccess("Brand"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getAllBillOfLiveProduct = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, startDate, endDate, activeFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "i" } }, { code: { $regex: search, $options: "i" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
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
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(brandModel, criteria, {}, options);
    const totalData = await countData(brandModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Brand"), { brand_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getBillOfLiveProductById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getBrandSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await getFirstMatch(
      brandModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "parentBrandId", select: "name" },
        ],
      }
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Brand"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Brand"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

// Dropdown API - returns only active brands in { _id, name } format
export const getBillOfLiveProductDropdown = async (req, res) => {
  reqInfo(req);
  try {
    let { user } = req?.headers,
      { parentBrandFilter } = req.query,
      companyId = user?.companyId?._id;

    let criteria: any = { isDeleted: false, isActive: true };

    // if (user?.role?.name !== USER_ROLES.SUPER_ADMIN) {
    //   companyId = new ObjectId(user?.companyId?._id);
    // }

    if (parentBrandFilter) criteria.parentBrandId = new ObjectId(parentBrandFilter);

    if (companyId) criteria.companyId = companyId;

    const response = await getDataWithSorting(
      brandModel,
      criteria,
      { _id: 1, name: 1, parentBrandId: 1 },
      {
        sort: { name: 1 },
      }
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      parentBrandId: item.parentBrandId,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Brand"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getBillOfLiveProductTree = async (req, res) => {
  reqInfo(req);
  try {
    const brands = await brandModel.aggregate([
      {
        $match: {
          isDeleted: false,
          parentBrandId: null,
        },
      },
      {
        $graphLookup: {
          from: "brands",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentBrandId",
          as: "descendants",
          restrictSearchWithMatch: { isDeleted: false },
          maxDepth: 5,
        },
      },
    ]);

    const buildTree = (root) => {
      const map = {};

      root.descendants.forEach((brand) => {
        map[brand._id.toString()] = {
          _id: brand._id,
          name: brand.name,
          code: brand.code,
          parentBrandId: brand.parentBrandId,
          children: [],
        };
      });

      root.descendants.forEach((brand) => {
        if (brand.parentBrandId) {
          const parentId = brand.parentBrandId.toString();
          if (map[parentId]) {
            map[parentId].children.push(map[brand._id.toString()]);
          }
        }
      });

      const children = Object.values(map).filter((brand: any) => brand.parentBrandId?.toString() === root._id.toString());

      return {
        _id: root._id,
        name: root.name,
        code: root.code,
        children,
      };
    };

    const response = brands.map(buildTree);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Brand tree"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
