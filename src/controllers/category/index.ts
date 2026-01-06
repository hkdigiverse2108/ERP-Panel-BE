import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { categoryModel } from "../../database/model";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addCategorySchema, deleteCategorySchema, editCategorySchema, getCategorySchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addCategory = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const companyId = user?.companyId?._id;
    const { error, value } = addCategorySchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const existingCategory = await getFirstMatch(categoryModel, { companyId, code: value.code, isDeleted: false }, {}, {});

    if (existingCategory) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Category code"), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;
    value.companyId = companyId;

    const response = await createOne(categoryModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage.addDataSuccess("Category"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getAllCategory = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page = 1, limit = 10, search, startDate, endDate, activeFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

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

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "parentCategoryId", select: "name" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(categoryModel, criteria, {}, options);
    const totalData = await countData(categoryModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Category"), { category_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getCategoryById = async (req, res) => {
  reqInfo(req);
  try {
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
        ],
      }
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Category"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Category"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const editCategoryById = async (req, res) => {
  reqInfo(req);
  try {
    const user = req.headers;
    const { error, value } = editCategorySchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const existingCategory = await getFirstMatch(categoryModel, { code: value.code, _id: { $ne: value.id }, isDeleted: false }, {}, {});

    if (existingCategory) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Category code"), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(categoryModel, { _id: new ObjectId(value.id), isDeleted: false }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage.updateDataError("Category"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.updateDataSuccess("Category"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
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
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Category"), {}, {}));
    }

    const response = await updateData(categoryModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.deleteDataSuccess("Category"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

// Dropdown API - returns only active categories in { _id, name } format
export const getCategoryDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    const response = await getDataWithSorting(
      categoryModel,
      criteria,
      { _id: 1, name: 1, parentCategoryId: 1 },
      {
        sort: { name: 1 },
      }
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      parentCategoryId: item.parentCategoryId,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Category"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getCategoryTree = async (req, res) => {
  reqInfo(req);
  try {
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

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Category tree"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
