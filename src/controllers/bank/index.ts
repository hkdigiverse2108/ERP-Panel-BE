import { apiResponse, HTTP_STATUS, USER_ROLES } from "../../common";
import { branchModel, companyModel } from "../../database";
import { bankModel } from "../../database/model/bank";
import { checkIdExist, countData, createOne, findOneAndPopulate, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addBankSchema, deleteBankSchema, editBankSchema, getBankSchema } from "../../validation";

export const addBank = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let companyId = user?.companyId?._id;

    const { error, value } = addBankSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    if (user.role?.name === USER_ROLES.SUPER_ADMIN) {
      companyId = value?.companyId;
    }

    if (!(await checkIdExist(companyModel, companyId, "Company", res))) return;

    if (value?.branchIds?.length) {
      for (const branch of value?.branchIds) {
        if (!(await checkIdExist(branchModel, branch, "Branch", res))) return;
      }
    }

    const isExist = await getFirstMatch(bankModel, { bankAccountNumber: value?.bankAccountNumber, isDeleted: false }, {}, {});
    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Bank Account Number"), {}, {}));

    value.createdBy = user?._id;
    value.updatedBy = user?._id;
    value.companyId = companyId;

    const response = await createOne(bankModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Bank"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editBank = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let companyId = user?.companyId?._id;

    const { error, value } = editBankSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    if (user.role === USER_ROLES.SUPER_ADMIN) {
      companyId = value?.companyId;
    }
    if (!(await checkIdExist(bankModel, value?.bankId, "Bank", res))) return;

    if (!(await checkIdExist(companyModel, companyId, "Company", res))) return;

    if (value?.branchIds?.length) {
      for (const branch of value?.branchIds) {
        if (!(await checkIdExist(branchModel, branch, "Branch", res))) return;
      }
    }

    const isExist = await getFirstMatch(bankModel, { bankAccountNumber: value?.bankAccountNumber, isDeleted: false, _id: { $ne: value?.bankId } }, {}, {});
    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Bank Account Number"), {}, {}));

    value.updatedBy = user?._id;

    const response = await updateData(bankModel, { _id: value?.bankId, isDeleted: false }, value, {});
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Bank"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteBankById = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = deleteBankSchema.validate(req.params);

    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_GATEWAY, error?.details[0]?.message, {}, {}));

    if (!(await checkIdExist(bankModel, value?.id, "Bank", res))) return;

    value.updatedBy = user?._id;
    value.isDeleted = true;

    const response = await updateData(bankModel, { _id: value?.id, isDeleted: false }, value, {});
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Bank"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Bank"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllBank = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, startDate, endDate, activeFilter } = req.query;

    let criteria: any = { isDeleted: false };

    if (companyId) criteria.companyId = companyId;

    if (search) criteria.$or = [{ accountHolderName: { $regex: search, $options: "si" }, bankAccountNumber: { $regex: search, $options: "si" } }];

    if (activeFilter !== undefined) criteria.isActive = activeFilter === "true";

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
        { path: "branchIds", select: "name" },
        { path: "address.country", select: "name code" },
        { path: "address.state", select: "name code" },
        { path: "address.city", select: "name code" },
      ],
    };

    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(bankModel, criteria, {}, options);

    const totalData = await countData(bankModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const stateObj = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Bank"), { bank_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getBankById = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getBankSchema.validate(req.params);
    const { id } = value;
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const response = await getFirstMatch(
      bankModel,
      { _id: id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchIds", select: "name" },
          { path: "address.country", select: "name code" },
          { path: "address.state", select: "name code" },
          { path: "address.city", select: "name code" },
        ],
      },
    );

    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Bank"), {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Bank"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Bank Dropdown API
export const getBankDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { search } = req.query;

    const userRole = user?.role?.name;
    let companyId = user?.companyId?._id;

    const queryCompanyId = req.query?.companyFilter;

    let criteria: any = { isDeleted: false, isActive: true };

    if (queryCompanyId && userRole === USER_ROLES.SUPER_ADMIN) criteria.companyId = queryCompanyId;
    else if (companyId) criteria.companyId = companyId;

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }, { accountHolderName: { $regex: search, $options: "si" } }, { bankAccountNumber: { $regex: search, $options: "si" } }];
    }

    const response = await getDataWithSorting(
      bankModel,
      criteria,
      { name: 1, accountHolderName: 1, bankAccountNumber: 1, branchName: 1, ifscCode: 1, upiId: 1 },
      {
        sort: { name: 1 },
        limit: search ? 50 : 1000,
      },
    );
    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name || `${item.accountHolderName} - ${item.bankAccountNumber}`,
      accountHolderName: item.accountHolderName,
      bankAccountNumber: item.bankAccountNumber,
      branchName: item.branchName,
      ifscCode: item.ifscCode,
      upiId: item.upiId,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Bank Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
