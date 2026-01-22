import { apiResponse, generateHash, HTTP_STATUS, USER_ROLES, USER_TYPES } from "../../common";
import { branchModel, companyModel, locationModel, moduleModel, permissionModel, roleModel, userModel } from "../../database";
import { checkCompany, checkIdExist, checkLocationExist, countData, createOne, getData, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addUserSchema, deleteUserSchema, editUserSchema, getUserSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addUser = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    let { error, value } = addUserSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);

    if (!(await checkIdExist(branchModel, value?.branchId, "Branch", res))) return;
    if (!(await checkIdExist(roleModel, value?.role, "Role", res))) return;

    if (!(await checkLocationExist(locationModel, value?.address, res))) return;

    const phoneNo = value?.phoneNo?.phoneNo;

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (phoneNo) orCondition.push({ "phoneNo.phoneNo": phoneNo });
    if (value?.username) orCondition.push({ username: value?.username });
    if (value?.panNumber) orCondition.push({ panNumber: value?.panNumber });
    let existingUser = null;

    if (orCondition.length) {
      existingUser = await getFirstMatch(userModel, { $or: orCondition, isDeleted: false }, {}, {});

      if (existingUser) {
        let errorText = "";
        if (existingUser?.email === value?.email) errorText = "Email";
        else if (Number(existingUser?.phoneNo?.phoneNo) === Number(phoneNo)) errorText = "Phone number";
        else if (existingUser?.username === value?.username) errorText = "Username";
        else if (existingUser?.panNumber === value?.panNumber) errorText = "PAN Number";
        else errorText = "User";

        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist(errorText), {}, {}));
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;
    value.showPassword = value?.password;
    value.password = await generateHash(value?.password);

    const response = await createOne(userModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    if (value?.companyId) await updateData(companyModel, { _id: value?.companyId, isDeleted: false }, { $push: { userIds: response?._id } }, {});

    if (value?.role) {
      let allModules = await getData(moduleModel, { isActive: true, isDeleted: false, default: true }, {}, {});
      if (allModules && allModules.length > 0) {
        for (let module of allModules) {
          let permissionData = {
            moduleId: new ObjectId(module._id),
            roleId: new ObjectId(value.role),
            view: true,
            add: true,
            edit: true,
            delete: true,
            isActive: true
          };

          await updateData(permissionModel, { roleId: new ObjectId(value.role), moduleId: new ObjectId(module._id) }, permissionData, { upsert: true, new: true });
          await updateData(moduleModel, { _id: new ObjectId(module._id) }, { default: true }, {});
        }
      }
    }

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("User"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editUserById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = editUserSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));
    const isUserExist = await getFirstMatch(userModel, { _id: value?.userId, isDeleted: false }, {}, {});
    if (!isUserExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("User"), {}, {}));

    if (value?.companyId) {
      value.companyId = await checkCompany(user, value);
    }

    if (!(await checkIdExist(branchModel, value?.branchId, "Branch", res))) return;
    if (!(await checkIdExist(roleModel, value?.role, "Role", res))) return;

    if (!(await checkLocationExist(locationModel, value?.address, res))) return;

    const phoneNo = value?.phoneNo?.phoneNo;

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (phoneNo) orCondition.push({ "phoneNo.phoneNo": phoneNo });
    if (value?.username) orCondition.push({ username: value?.username });
    if (value?.panNumber) orCondition.push({ panNumber: value?.panNumber });

    let existingUser = null;

    if (orCondition.length) {
      existingUser = await getFirstMatch(userModel, { $or: orCondition, _id: { $ne: value?.userId }, isDeleted: false }, {}, {});

      if (existingUser) {
        let errorText = "";
        if (existingUser?.email === value?.email) errorText = "Email";
        else if (Number(existingUser?.phoneNo?.phoneNo) === Number(phoneNo)) errorText = "Phone number";
        else if (existingUser?.username === value?.username) errorText = "Username";
        else if (existingUser?.panNumber === value?.panNumber) errorText = "PAN Number";
        else errorText = "User";

        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist(errorText), {}, {}));
      }
    }
    value.updatedBy = user?._id || null;

    if (value?.password) {
      value.showPassword = value?.password;
      value.password = await generateHash(value?.password);
    }

    let response = await updateData(userModel, { _id: new ObjectId(value?.userId), isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("User"), {}, {}));
    const { password, ...rest } = response;
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("User"), rest, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteUserById = async (req, res) => {
  try {
    const { user } = req?.headers;
    const { error, value } = deleteUserSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).status(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isUserExist = await getFirstMatch(userModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, { populate: [{ path: "role", select: "name" }] });

    if (!isUserExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("User"), {}, {}));

    if (isUserExist.role.name === USER_ROLES.SUPER_ADMIN) return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, responseMessage?.accessDenied, {}, {}));

    if (isUserExist?.companyId) await updateData(companyModel, { _id: value?.companyId, isDeleted: false }, { $pull: { userIds: isUserExist?._id } }, {});

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(userModel, { _id: new ObjectId(value?.id) }, payload, {});
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("User"), {}, {}));
    const { password, ...rest } = response;

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("User"), rest, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllUser = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, startDate, endDate, activeFilter, branchFilter, companyFilter } = req.query;

    // let criteria: any = { isDeleted: false, role: USER_ROLES.USER };
    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    let roles = await getData(roleModel, { name: USER_ROLES.SUPER_ADMIN, isDeleted: false }, { _id: 1 }, {});
    let roleIds = roles.map((role) => new ObjectId(role._id));
    criteria.role = { $nin: roleIds };

    if (branchFilter) {
      criteria.branchId = branchFilter;
    }
    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.$or = [{ fullName: { $regex: search, $options: "si" } }];
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
        { path: "role", select: "name" },
        { path: "address.country", select: "name code" },
        { path: "address.state", select: "name code" },
        { path: "address.city", select: "name code" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(userModel, criteria, { password: 0 }, options);

    const totalData = await countData(userModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("User"), { user_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getUserById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getUserSchema.validate(req.params);
    const { id } = value;
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      userModel,
      { _id: id, isDeleted: false },
      { password: 0 },
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "role", select: "name" },
          { path: "address.country", select: "name code" },
          { path: "address.state", select: "name code" },
          { path: "address.city", select: "name code" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("User"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("User"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

export const superAdminOverridePermissions = async (req, res) => {
  try {
    const superAdmin = { role: "superAdmin" };
    const adminId = req.params.id;
    const newPermissions = req.body.permissions;

    if (superAdmin.role !== USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Only Super Admin can change admin permissions.", {}, {}));
    }

    const adminUser: any = await getFirstMatch(userModel, { _id: adminId, isDeleted: false }, { password: 0 }, {});

    if (!adminUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Admin"), {}, {}));
    }

    if (adminUser.role !== USER_TYPES.ADMIN) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Target user is not an Admin.", {}, {}));
    }

    adminUser.permissions = newPermissions;
    await updateData(userModel, { _id: adminId }, adminUser, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Admin permissions updated by Super Admin.", adminUser, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};
