import { apiResponse, HTTP_STATUS, USER_ROLES } from "../../common";
import { companyModel, userModel } from "../../database";
import { roleModel } from "../../database/model/role";
import { checkIdExist, countData, createOne, findOneAndPopulate, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addRoleSchema, deleteRoleSchema, editRoleSchema, getRoleSchema } from "../../validation";

export const addRole = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userRole = user?.role?.name;
    let { error, value } = addRoleSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));
    if (value?.name) value.name = value.name.trim().toLowerCase();

    if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));

    let companyId = null;
    if (userRole === USER_ROLES.SUPER_ADMIN) {
      companyId = value?.companyId;
    } else {
      companyId = user?.companyId?._id;
    }

    if (companyId) {
      if (!(await checkIdExist(companyModel, companyId, "Company", res))) return;
    }

    const isAdminRole = value?.name === USER_ROLES.ADMIN || value?.name === USER_ROLES.SUPER_ADMIN;

    if (isAdminRole && userRole !== USER_ROLES.SUPER_ADMIN) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.accessDenied, {}, {}));

    let existingRole = null;

    if (companyId) {
      existingRole = await getFirstMatch(roleModel, { companyId, name: value?.name, isDeleted: false }, {}, {});
    } else {
      existingRole = await getFirstMatch(roleModel, { name: value?.name, isDeleted: false, companyId: null }, {}, {});
    }

    if (existingRole) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Role"), {}, {}));

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;
    value.companyId = companyId ?? null;

    const response = await createOne(roleModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    if (value?.companyId) await updateData(companyModel, { _id: value?.companyId, isDeleted: false }, { $push: { roles: response?._id } }, {});

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editRole = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userRole = user?.role?.name;

    let { error, value } = editRoleSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (value?.name) value.name = value.name.trim().toLowerCase();

    if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));

    let companyId = null;
    if (userRole === USER_ROLES.SUPER_ADMIN) {
      companyId = value?.companyId;
    } else {
      companyId = user?.companyId?._id;
    }

    if (companyId) {
      const isCompanyExist = await getFirstMatch(companyModel, { _id: companyId, isDeleted: false }, {}, {});
      if (!isCompanyExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    let existingRole;

    existingRole = await getFirstMatch(roleModel, { _id: value?.roleId, isDeleted: false }, {}, {});
    if (!existingRole) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Role"), {}, {}));

    const isAdminRole = value?.name === USER_ROLES.ADMIN || value?.name === USER_ROLES.SUPER_ADMIN;

    if (isAdminRole && userRole !== USER_ROLES.SUPER_ADMIN) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.accessDenied, {}, {}));

    if (value?.name) {
      if (companyId) {
        existingRole = await getFirstMatch(roleModel, { companyId, name: value?.name, isDeleted: false, _id: { $ne: value?.roleId } }, {}, {});
      } else {
        existingRole = await getFirstMatch(roleModel, { name: value?.name, isDeleted: false, companyId: null, _id: { $ne: value?.roleId } }, {}, {});
      }
      if (existingRole) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Role"), {}, {}));
    }

    value.updatedBy = user?._id;
    value.companyId = companyId ?? null;
    const response = await updateData(roleModel, { _id: value?.roleId, isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Role"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteRole = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userRole = user?.role?.name;

    let { error, value } = deleteRoleSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));

    const existingRole = await getFirstMatch(roleModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!existingRole) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Role"), {}, {}));

    const isRoleUsed = await getFirstMatch(userModel, { role: value?.id, isDeleted: false }, {}, {});

    if (isRoleUsed) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.roleInUse, {}, {}));

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(roleModel, { _id: value?.id }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Role"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllRole = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page, limit, search, startDate, endDate, activeFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

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
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
      ],
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
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Role"), { role_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getRoleById = async (req, res) => {
  reqInfo(req);

  try {
    const { error, value } = getRoleSchema.validate(req.params);
    const { id } = value;

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).status(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      roleModel,
      { _id: id },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
        ],
      }
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage.getDataNotFound("Role"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Role"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
