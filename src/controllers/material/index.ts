import { apiResponse, HTTP_STATUS } from "../../common";
import { materialModel } from "../../database";
import { checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter, checkBranch } from "../../helper";
import { addMaterialSchema, deleteMaterialSchema, editMaterialSchema, getMaterialSchema } from "../../validation";
import { redisGet, redisSet, redisdelPattern } from "../../helper";

export const addMaterial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addMaterialSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);
    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    if (!value.branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Branch Id"), {}, {}));
    let isExist = await getFirstMatch(materialModel, { companyId: value.companyId, materialNo: value?.materialNo, isDeleted: false }, {}, {});

    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Material No"), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(materialModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material"), {}, {}));

    await redisdelPattern("material:*");
    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.getDataSuccess("Material"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editMaterial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editMaterialSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const { materialId } = value;

    const isExist = await getFirstMatch(
      materialModel,
      {
        _id: materialId,
        isDeleted: false,
      },
      {},
      {},
    );

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material"), {}, {}));

    if (value?.materialNo) {
      const duplicate = await getFirstMatch(
        materialModel,
        {
          _id: { $ne: materialId },
          companyId: isExist.companyId,
          materialNo: value.materialNo,
          isDeleted: false,
        },
        {},
        {},
      );

      if (duplicate) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Material No"), {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(materialModel, { _id: materialId }, value, { new: true });

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.updateDataError("Material"), {}, {}));

    await redisdelPattern("material:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Material"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteMaterial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = deleteMaterialSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const isExist = await getFirstMatch(materialModel, { _id: value.id, isDeleted: false }, {}, {});

    if (!isExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material"), {}, {}));

    const response = await updateData(materialModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Material"), {}, {}));

    await redisdelPattern("material:*");
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Material"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllMaterial = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `material:all:req:${JSON.stringify(req.query)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Material"), cachedData, {}));
    let { page, limit, search, startDate, endDate, activeFilter, companyFilter, branchFilter } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 10;

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

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ materialNo: { $regex: search, $options: "si" } }, { description: { $regex: search, $options: "si" } }];
    }

    applyDateFilter(criteria, startDate as string, endDate as string, "materialDate");

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "createdBy", select: "fullName userType" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(materialModel, criteria, {}, options);

    const totalData = await countData(materialModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
    };

    const result = { material_data: response, totalData, state: stateObj };
    await redisSet(cacheKey, result, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Material"), result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getMaterialById = async (req, res) => {
  reqInfo(req);
  try {
    let { error, value } = getMaterialSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

    const { user } = req?.headers;
    const userType = user?.userType;
    const companyId = user?.companyId?._id;
    const branchId = user?.branchId?._id;
    const cacheKey = `material:one:req:${JSON.stringify(req.params)}:user:${userType}:company:${companyId}:branch:${branchId}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Material"), cachedData, {}));

    const response = await getFirstMatch(
      materialModel,
      { _id: value.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "createdBy", select: "fullName userType" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Material"), {}, {}));

    await redisSet(cacheKey, response, 3600);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Material"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
