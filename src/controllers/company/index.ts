import { supplierBillModel } from './../../database/model/supplierBill';
import { contactModel } from './../../database/model/contact';
import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { companyModel } from "../../database/model";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addCompanySchema, deleteCompanySchema, editCompanySchema, getCompanySchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addCompany = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = addCompanySchema.validate(req.body);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0].message, {}, {}));

    let existingCompany = undefined;
    if (value?.email) {
      existingCompany = await getFirstMatch(companyModel, { email: value?.email, isDeleted: false }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Email"), {}, {}));
    }
    if (value?.phoneNo) {
      existingCompany = await getFirstMatch(companyModel, { phoneNo: value?.phoneNo, isDeleted: false }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Phone number"), {}, {}));
    }

    if (value?.displayName) {
      existingCompany = await getFirstMatch(companyModel, { displayName: value?.displayName, isDeleted: false }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Display name"), {}, {}));
    }

    if (value?.contactName) {
      existingCompany = await getFirstMatch(companyModel, { contactName: value?.contactName, isDeleted: false }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Contact name"), {}, {}));
    }

    if (value?.supportEmail) {
      existingCompany = await getFirstMatch(companyModel, { supportEmail: value?.supportEmail, isDeleted: false }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Support email"), {}, {}));
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

export const deleteCompanyById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    let { error, value } = deleteCompanySchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).status(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    const isCompanyExist = await getFirstMatch(companyModel, { _id: new ObjectId(value?.id), isDeleted: false }, {}, {});

    if (!isCompanyExist) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Company"), {}, {}));

    value.isDeleted = true;
    value.updatedBy = user?._id || null

    const response = await updateData(companyModel, { _id: new ObjectId(value?.id) }, value, {});

    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Company details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Company details"), response, {}));
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

    if (error) return res.status(HTTP_STATUS.BAD_GATEWAY).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0].message, {}, {}));

    let existingCompany = undefined;

    if(value?.email){
      existingCompany = await getFirstMatch(companyModel, { email: value?.email, isDeleted: false, _id: { $ne: value?.companyId } }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Email"), {}, {}));
    }

    if(value?.phoneNo){
      existingCompany = await getFirstMatch(companyModel, { phoneNo: value?.phoneNo, isDeleted: false, _id: { $ne: value?.companyId } }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Phone number"), {}, {})); 
    }

    if(value?.displayName){
      existingCompany = await getFirstMatch(companyModel, { displayName: value?.displayName, isDeleted: false, _id: { $ne: value?.companyId } }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Display name"), {}, {}));
    }
      
    if(value?.contactName){
      existingCompany = await getFirstMatch(companyModel, { contactName: value?.contactName, isDeleted: false, _id: { $ne: value?.companyId } }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Contact name"), {}, {}));
    }

    if(value?.supportEmail){
      existingCompany = await getFirstMatch(companyModel, { supportEmail: value?.supportEmail, isDeleted: false, _id: { $ne: value?.companyId } }, {}, {});
      if (existingCompany) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Support email"), {}, {}));
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

export const getAllCompany = async (req, res) => {
  reqInfo(req);
  try {
    let { page, limit, search, startDate, endDate } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "i" } }, { displayName: { $regex: search, $options: "i" } }, { contactName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { phoneNo: { $regex: search, $options: "i" } }, { ownerNo: { $regex: search, $options: "i" } }];
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

    const response = await getDataWithSorting(companyModel, criteria, {}, options);
    const totalData = await countData(companyModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = { page, limit, totalPages};

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

    const response = await getFirstMatch(companyModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Company details"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Company details"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).status(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, {}));
  }
};
