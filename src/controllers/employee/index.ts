import { HTTP_STATUS, USER_TYPES } from "../../common";
import { apiResponse } from "../../common/utils";
import { branchModel, companyModel, employeeModel } from "../../database/model";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addEmployeeSchema, deleteEmployeeSchema, editEmployeeSchema, getEmployeeSchema } from "../../validation/employee";

const ObjectId = require("mongoose").Types.ObjectId;

export const addEmployee = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;

    let { error, value } = addEmployeeSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const isCompanyExist = await getFirstMatch(companyModel, { _id: value?.companyId }, {}, {});
    if (!isCompanyExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));

    if (value?.branchId) {
      const isBranchExist = await getFirstMatch(branchModel, { _id: value?.branchId }, {}, {});
      if (!isBranchExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Branch"), {}, {}));
    }

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (value?.phoneNo) orCondition.push({ phoneNo: value?.phoneNo });
    if (value?.username) orCondition.push({ username: value?.username });
    if (value?.panNumber) orCondition.push({ panNumber: value?.panNumber });
    let existingEmployee = null;

    if (orCondition.length) {
      existingEmployee = await getFirstMatch(employeeModel, { $or: orCondition, _id: { $ne: value?.employeeId }, isDeleted: false }, {}, {});

      if (existingEmployee) {
        if (existingEmployee?.email === value?.email) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Email"), {}, {}));
        if (existingEmployee?.phoneNo === value?.phoneNo) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Phone number"), {}, {}));
        if (existingEmployee?.username === value?.username) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Username"), {}, {}));
        if (existingEmployee?.panNumber === value?.panNumber) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("PAN Number"), {}, {}));
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(employeeModel, value);

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Employee"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editEmployeeById = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;

    let { error, value } = editEmployeeSchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0].message, {}, {}));

    const isEmployeeExist = await getFirstMatch(employeeModel, { _id: value?.employeeId, isDeleted: false }, {}, {});
    if (!isEmployeeExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Employee"), {}, {}));

    const isCompanyExist = await getFirstMatch(companyModel, { _id: value?.companyId, isDeleted: false }, {}, {});
    if (!isCompanyExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));

    if (value?.branchId) {
      const isBranchExist = await getFirstMatch(branchModel, { _id: value?.branchId }, {}, {});
      if (!isBranchExist) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Branch"), {}, {}));
    }

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (value?.phoneNo) orCondition.push({ phoneNo: value?.phoneNo });
    if (value?.username) orCondition.push({ username: value?.username });
    if (value?.panNumber) orCondition.push({ panNumber: value?.panNumber });

    let existingEmployee = null;

    if (orCondition.length) {
      existingEmployee = await getFirstMatch(employeeModel, { $or: orCondition, _id: { $ne: value?.employeeId }, isDeleted: false }, {}, {});

      if (existingEmployee) {
        if (existingEmployee?.email === value?.email) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Email"), {}, {}));
        if (existingEmployee?.phoneNo === value?.phoneNo) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Phone number"), {}, {}));
        if (existingEmployee?.username === value?.username) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Username"), {}, {}));
        if (existingEmployee?.panNumber === value?.panNumber) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("PAN Number"), {}, {}));
      }
    }
    value.updatedBy = user?._id || null;

    const response = await updateData(employeeModel, { _id: new ObjectId(value?.employeeId), isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Employee details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Employee details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteEmployeeById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = deleteEmployeeSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).status(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    const isEmployeeExist = await getFirstMatch(employeeModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isEmployeeExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Employee"), {}, {}));

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(employeeModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Employee"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Employee"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllEmployee = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let { page, limit, search, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (!user || !user.companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Company information missing in user data.", {}, {}));
    }

    const isCompanyExist = await getFirstMatch(companyModel, { _id: user?.companyId }, {}, {});
    if (isCompanyExist) criteria.companyId = user.companyId;

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { username: { $regex: search, $options: "si" } }, { phoneNo: { $regex: search, $options: "si" } }, { email: { $regex: search, $options: "si" } }];
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
        criteria.createdAt = { $gte: start, $lte: end };
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

    const response = await getDataWithSorting(employeeModel, criteria, {}, options);
    const totalData = await countData(employeeModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Employee"), { employee_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getEmployeeById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getEmployeeSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const response = await getFirstMatch(employeeModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Employee"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Employee"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

export const updateEmployeePermissions = async (req, res) => {
  try {
    const admin = req.headers.user;
    // const admin = { role: 'admin', companyId:"693d24b2dc55f48922660275" }
    const employeeId = req.params.id;
    const newPermissions = req.body.permissions;

    if (admin.role !== USER_TYPES.ADMIN) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Only admin can update permissions.", {}, {}));
    }

    const employee = await getFirstMatch(employeeModel, { _id: employeeId, isDeleted: false }, { password: 0 }, {});
    if (!employee) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Employee"), {}, {}));
    }

    if (employee.companyId.toString() !== admin.companyId.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Unauthorized: Different company.", {}, {}));
    }

    if (employee.role === USER_TYPES.SUPER_ADMIN) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Cannot modify Super Admin.", {}, {}));
    }

    employee.permissions = newPermissions;
    await updateData(employeeModel, { _id: employeeId }, employee, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Permissions updated.", employee, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};
