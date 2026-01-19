import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { companyModel } from "../../database/model";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addCompanySchema, deleteCompanySchema, editCompanySchema, getCompanySchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addCompany = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = addCompanySchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    // if (!(await checkIdExist(bankModel, value?.bankId, "Bank", res))) return;

    const phoneNo = value?.phoneNo?.phoneNo;
    // const ownerNo = value?.ownerNo?.phoneNo;

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (phoneNo) orCondition.push({ "phoneNo.phoneNo": phoneNo });
    // if (ownerNo) orCondition.push({ "owner.phoneNo": ownerNo });
    if (value?.displayName) orCondition.push({ displayName: value?.displayName });
    if (value?.contactName) orCondition.push({ contactName: value?.contactName });
    if (value?.supportEmail) orCondition.push({ supportEmail: value?.supportEmail });

    let existingCompany = null;

    if (orCondition.length) {
      existingCompany = await getFirstMatch(companyModel, { $or: orCondition, isDeleted: false }, {}, {});

      if (existingCompany) {
        if (existingCompany?.email === value?.email) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Email"), {}, {}));
        if (existingCompany?.phoneNo?.phoneNo === phoneNo) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Phone number"), {}, {}));
        // if (existingCompany?.ownerNo?.phoneNo === ownerNo) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Owner number"), {}, {}));
        if (existingCompany?.displayName === value?.displayName) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Display Name"), {}, {}));
        if (existingCompany?.contactName === value?.contactName) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Contact Name"), {}, {}));
        if (existingCompany?.supportEmail === value?.supportEmail) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Support Email"), {}, {}));
      }
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(companyModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Company"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editCompanyById = async (req, res) => {
  reqInfo(req);

  try {
    const { user } = req?.headers;
    let { error, value } = editCompanySchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    if (!(await checkIdExist(companyModel, value?.companyId, "Company", res))) return;

    // if (!(await checkIdExist(bankModel, value?.bankId, "Bank", res))) return;

    const phoneNo = value?.phoneNo?.phoneNo;
    // const ownerNo = value?.ownerNo?.phoneNo;

    const orCondition = [];
    if (value?.email) orCondition.push({ email: value?.email });
    if (phoneNo) orCondition.push({ "phoneNo.phoneNo": phoneNo });
    // if (ownerNo) orCondition.push({ "owner.phoneNo": ownerNo });
    if (value?.displayName) orCondition.push({ displayName: value?.displayName });
    if (value?.contactName) orCondition.push({ contactName: value?.contactName });
    if (value?.supportEmail) orCondition.push({ supportEmail: value?.supportEmail });

    let existingCompany = null;

    if (orCondition.length) {
      existingCompany = await getFirstMatch(companyModel, { $or: orCondition, _id: { $ne: value?.companyId }, isDeleted: false }, {}, {});

      if (existingCompany) {
        if (existingCompany?.email === value?.email) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Email"), {}, {}));
        if (existingCompany?.phoneNo?.phoneNo === phoneNo) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Phone number"), {}, {}));
        // if (existingCompany?.ownerNo?.phoneNo === ownerNo) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Owner number"), {}, {}));
        if (existingCompany?.displayName === value?.displayName) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Display Name"), {}, {}));
        if (existingCompany?.contactName === value?.contactName) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Contact Name"), {}, {}));
        if (existingCompany?.supportEmail === value?.supportEmail) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Support Email"), {}, {}));
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(companyModel, { _id: new ObjectId(value?.companyId), isDeleted: false }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Company details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Company details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteCompanyById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = deleteCompanySchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).status(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const isCompanyExist = await getFirstMatch(companyModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isCompanyExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Company"), {}, {}));

    value.isDeleted = true;
    value.updatedBy = user?._id || null;

    const response = await updateData(companyModel, { _id: new ObjectId(value?.id) }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Company details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Company details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllCompany = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate, activeFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { displayName: { $regex: search, $options: "si" } }, { contactName: { $regex: search, $options: "si" } }, { email: { $regex: search, $options: "si" } }, { phoneNo: { $regex: search, $options: "si" } }, { ownerNo: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && isNaN(end.getTime())) {
        criteria.createdAt = { $gte: start, $lte: end };
      }
    }

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "bankId", select: "name" },
        { path: "userIds", select: "fullName" },
        { path: "roles", select: "name" },
        { path: "country", select: "name code" },
        { path: "state", select: "name code" },
        { path: "city", select: "name code" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(companyModel, criteria, {}, options);
    const totalData = await countData(companyModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Company"), { company_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getCompanyById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getCompanySchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    const response = await getFirstMatch(
      companyModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "bankId", select: "name" },
          { path: "userIds", select: "fullName" },
          { path: "roles", select: "name" },
          { path: "country", select: "name code" },
          { path: "state", select: "name code" },
          { path: "city", select: "name code" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Company details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Company details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};

// Dropdown API - returns only active companies in { _id, name } format
export const getCompanyDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { search } = req.query;

    let criteria: any = { isDeleted: false, isActive: true };

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { displayName: { $regex: search, $options: "si" } }, { contactName: { $regex: search, $options: "si" } }];
    }

    const response = await getDataWithSorting(
      companyModel,
      criteria,
      { _id: 1, name: 1, displayName: 1 },
      {
        sort: { name: 1 },
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.displayName || item.name,
      displayName: item.displayName,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Company"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
