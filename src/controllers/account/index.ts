import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { accountModel, accountGroupModel } from "../../database";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addAccountSchema, deleteAccountSchema, editAccountSchema, getAccountSchema } from "../../validation/account";

const ObjectId = require("mongoose").Types.ObjectId;

export const addAccount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { error, value } = addAccountSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.getDataNotFound("Company"), {}, {}));
    }

    // Validate account group exists
    if (!(await checkIdExist(accountGroupModel, value?.groupId, "Account Group", res))) return;

    // Check if account name already exists for this company
    const isExist = await getFirstMatch(accountModel, { name: value?.name, companyId, isDeleted: false }, {}, {});
    if (isExist) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Account Name"), {}, {}));
    }

    // Set current balance same as opening balance if not provided
    if (value.currentBalance === undefined || value.currentBalance === null) {
      value.currentBalance = value.openingBalance || 0;
    }

    const accountData = {
      ...value,
      companyId,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(accountModel, accountData);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Account"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editAccount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editAccountSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(accountModel, { _id: value?.accountId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Account"), {}, {}));
    }

    // Validate account group if being changed
    if (value.groupId && value.groupId !== isExist.groupId.toString()) {
      if (!(await checkIdExist(accountGroupModel, value.groupId, "Account Group", res))) return;
    }

    // Check if account name already exists (if being changed)
    if (value.name && value.name !== isExist.name) {
      const nameExist = await getFirstMatch(accountModel, { name: value.name, companyId: isExist.companyId, isDeleted: false, _id: { $ne: value.accountId } }, {}, {});
      if (nameExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Account Name"), {}, {}));
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(accountModel, { _id: value?.accountId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Account"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Account"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteAccount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteAccountSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(accountModel, value?.id, "Account", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(accountModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Account"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Account"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllAccount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page = 1, limit = 10, search, type, groupId, isActive } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    if (type) {
      criteria.type = type;
    }

    if (groupId) {
      criteria.groupId = groupId;
    }

    if (isActive !== undefined) {
      criteria.isActive = isActive === "true";
    }

    const options = {
      sort: { name: 1 },
      populate: [
        { path: "groupId", select: "name nature" },
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(accountModel, criteria, {}, options);
    const totalData = await countData(accountModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Account"), { account_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneAccount = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getAccountSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      accountModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "groupId", select: "name nature parentGroupId" },
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
        ],
      }
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Account"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Account"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

// Account Dropdown API
export const getAccountDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { type, groupId, search } = req.query;

    let criteria: any = { isDeleted: false, isActive: true };
    if (companyId) {
      criteria.companyId = companyId;
    }

    if (type) {
      criteria.type = type;
    }

    if (groupId) {
      criteria.groupId = groupId;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const response = await getDataWithSorting(
      accountModel,
      criteria,
      { name: 1, type: 1, currentBalance: 1 },
      {
        sort: { name: 1 },
        limit: search ? 50 : 1000,
        populate: [{ path: "groupId", select: "name" }],
      }
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      type: item.type,
      currentBalance: item.currentBalance,
      groupName: item.groupId?.name,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Account Dropdown"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
