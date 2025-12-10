import { appendFile } from "fs";
import { apiResponse, HTTP_STATUS, isValidObjectId } from "../../common";
import { roleModel } from "../../database/model/role";
import { countData, createOne, getData, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addRoleSchema, deleteRoleSchema, editRoleSchema, getRoleSchema } from "../../validation";
import { userModel } from "../../database";

export const addRole = async (req, res) => {
  reqInfo(req);
  const { user } = req?.headers;
  try {
    const { error, value } = addRoleSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const existingRole = await getFirstMatch(roleModel, { role: value?.role, isDeleted: false }, {}, {});

    if (existingRole) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Role"), {}, {}));

    const payload = {
      ...value,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(roleModel, payload);

    if (!response) res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editRole = async (req, res) => {
  reqInfo(req);
  const { user } = req?.headers;
  try {
    let { error, value } = editRoleSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (!isValidObjectId(value?.roleId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("Role Id"), {}, {}));
    }

    let existingRole = await getFirstMatch(roleModel, { _id: value?.roleId, isDeleted: false }, {}, {});

    if (!existingRole) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Role"), {}, {}));

    existingRole = await getFirstMatch(roleModel, { role: value?.role, isDeleted: false, _id: { $ne: value?.roleId } }, {}, {});
    if (existingRole) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Role"), {}, {}));

    value.updatedBy = user?._id;
    const response = await updateData(roleModel, { _id: value?.roleId, isDeleted: false }, value, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteRole = async (req, res) => {
  reqInfo(req);
  try {
    let { error, value } = deleteRoleSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    // if (!isValidObjectId(value?.id)) {
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("Role Id"), {}, {}));
    // }

    const existingRole = await getFirstMatch(roleModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!existingRole) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Role"), {}, {}));

    const response = await updateData(roleModel, { _id: value?.id }, { isDeleted: true }, {});

    if (!response) return res.status(HTTP_STATUS?.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Role"), {}, {}));

    return res.status(HTTP_STATUS?.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllRole = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate, activeFilter, filterDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ role: { $regex: search, $options: "si" } }];
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
      skip: (page - 1) * limit,
      limit,
    };

    if (page && limit) {
      options.page = (parseInt(page) + 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(roleModel, criteria, {}, options);
    const totalData = await countData(roleModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
      totalData,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Role"), { role_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getRoleById = async (req, res) => {
  try {
    const { error, value } = getRoleSchema.validate(req.params);
    const { id } = value;

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).status(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (!isValidObjectId(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.invalidId("Role Id"), {}, {}));
    }

    const response = await getFirstMatch(roleModel, { _id: id }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Role"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
