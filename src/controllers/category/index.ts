import { apiResponse, HTTP_STATUS } from "../../common";
import { categoryModel } from "../../database";
import { applyDateFilter, checkBranch, checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, handleIncludeId, reqInfo, responseMessage, updateData, redisGet, redisSet, redisdelPattern } from "../../helper";
import { addCategorySchema, deleteCategorySchema, editCategorySchema, getCategorySchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addCategory = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = addCategorySchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);

    const existingCategory = await getFirstMatch(categoryModel, { companyId: value.companyId ?? null, code: value.code, isDeleted: false }, {}, {});

    if (existingCategory) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Category code"), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(categoryModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    await redisdelPattern("category:*");
    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Category"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const getAllCategory = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `category:all:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category"), cachedData, {}));

    let { page, limit, search, startDate, endDate, activeFilter, companyFilter, branchFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (branchId) {
      criteria.branchId = branchId;
    }

    if (branchFilter) {
      criteria.branchId = branchFilter;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { code: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    applyDateFilter(criteria, startDate as string, endDate as string);

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "parentCategoryId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(categoryModel, criteria, {}, options);
    const totalData = await countData(categoryModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    const responsePayload = { category_data: response, totalData, state };
    await redisSet(cacheKey, responsePayload, 3600);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category"), responsePayload, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getCategoryById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `category:one:req:${JSON.stringify(req.params)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category"), cachedData, {}));

    const { error, value } = getCategorySchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const response = await getFirstMatch(
      categoryModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "parentCategoryId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Category"), {}, {}));
    }

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editCategoryById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = editCategorySchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const existingCategory = await getFirstMatch(categoryModel, { code: value.code, _id: { $ne: value.categoryId }, isDeleted: false }, {}, {});

    if (existingCategory) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Category code"), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(categoryModel, { _id: new ObjectId(value.categoryId), isDeleted: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Category"), {}, {}));
    }

    await redisdelPattern("category:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Category"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteCategoryById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = deleteCategorySchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const category = await getFirstMatch(categoryModel, { _id: value.id, isDeleted: false }, {}, {});

    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Category"), {}, {}));
    }

    const response = await updateData(categoryModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    await redisdelPattern("category:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Category"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Dropdown API - returns only active categories in { _id, name } format
export const getCategoryDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `category:dropdown:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category"), cachedData, {}));

    let { parentCategoryFilter, onlyCategoryFilter, companyFilter, includeId } = req.query;
    let criteria: any = { isDeleted: false, isActive: true };

    if (Boolean(onlyCategoryFilter) === true) {
      criteria.parentCategoryId = null;
    }

    criteria = handleIncludeId(criteria, includeId);

    if (parentCategoryFilter) criteria.parentCategoryId = new ObjectId(parentCategoryFilter);

    const response = await getDataWithSorting(
      categoryModel,
      criteria,
      { _id: 1, name: 1, parentCategoryId: 1, branchId: 1 },
      {
        sort: { name: 1 },
        populate: [{ path: "branchId", select: "name" }],
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      parentCategoryId: item.parentCategoryId,
      branchId: item.branchId,
    }));

    await redisSet(cacheKey, dropdownData, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getCategoryTree = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `category:tree:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category tree"), cachedData, {}));

    const categories = await categoryModel.aggregate([
      {
        $match: {
          isDeleted: false,
          parentCategoryId: null,
        },
      },
      {
        $graphLookup: {
          from: "category",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentCategoryId",
          as: "descendants",
          restrictSearchWithMatch: { isDeleted: false },
          maxDepth: 5,
        },
      },
    ]);

    const buildTree = (root) => {
      const map = {};

      root.descendants.forEach((category) => {
        map[category._id.toString()] = {
          _id: category._id,
          name: category.name,
          code: category.code,
          parentCategoryId: category.parentCategoryId,
          children: [],
        };
      });

      root.descendants.forEach((category) => {
        if (category.parentCategoryId) {
          const parentId = category.parentCategoryId.toString();
          if (map[parentId]) {
            map[parentId].children.push(map[category._id.toString()]);
          }
        }
      });

      const children = Object.values(map).filter((category: any) => category.parentCategoryId?.toString() === root._id.toString());

      return {
        _id: root._id,
        name: root.name,
        code: root.code,
        children,
      };
    };

    const response = categories.map(buildTree);

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Category tree"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};



