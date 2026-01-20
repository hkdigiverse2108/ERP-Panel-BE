import { populate } from "dotenv";
import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { accountGroupModel } from "../../database/model";
import { checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addAccountGroupSchema, deleteAccountGroupSchema, editAccountGroupSchema, getAccountGroupSchema } from "../../validation";

const MAX_GROUP_LEVEL = 3;

const calculateGroupLevel = async (accountGroupModel, parentGroupId) => {
  if (!parentGroupId) return 0;

  let level = 0;
  let currentParentId = parentGroupId;
  const visited = new Set();

  while (currentParentId) {
    if (visited.has(String(currentParentId))) {
      throw new Error("Circular parent group reference detected");
    }

    visited.add(String(currentParentId));

    const parentGroup = await getFirstMatch(accountGroupModel, { _id: currentParentId, isDeleted: false }, { parentGroupId: 1 }, {});

    if (!parentGroup) break;

    level++;

    if (level > MAX_GROUP_LEVEL) {
      throw new Error(`Group level cannot be more than ${MAX_GROUP_LEVEL}`);
    }

    currentParentId = parentGroup.parentGroupId || null;
  }

  return level;
};

export const addAccountGroup = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addAccountGroupSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let isExist = await getFirstMatch(accountGroupModel, { name: value?.name, isDeleted: false }, {}, {});
    if (isExist) return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Account Group Name"), {}, {}));

    if (value?.parentGroupId && !(await checkIdExist(accountGroupModel, value?.parentGroupId, "Parent Group ID", res))) return;

    // ===== Calculate group level safely
    let groupLevel = 0;
    try {
      groupLevel = await calculateGroupLevel(accountGroupModel, value?.parentGroupId);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, err.message, {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;
    value.groupLevel = groupLevel || 0;

    const response = await createOne(accountGroupModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Account Group"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editAccountGroup = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editAccountGroupSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    let isExist = await getFirstMatch(accountGroupModel, { _id: value?.accountGroupId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Account Group"), {}, {}));
    }

    // Check if account name already exists (if being changed)
    if (value.name && value.name !== isExist.name) {
      isExist = await getFirstMatch(accountGroupModel, { name: value.name, companyId: isExist.companyId, isDeleted: false, _id: { $ne: value.accountGroupId } }, {}, {});
      if (isExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage.dataAlreadyExist("Account Group Name"), {}, {}));
      }
    }

    // ===== Calculate group level
    if (value?.parentGroupId) {
      let groupLevel = 0;
      try {
        groupLevel = await calculateGroupLevel(accountGroupModel, value?.parentGroupId);
      } catch (err) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, err.message, {}, {}));
      }
      value.groupLevel = groupLevel || 0;
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(accountGroupModel, { _id: value?.accountGroupId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Account Group"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Account Group"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteAccountGroup = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteAccountGroupSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(accountGroupModel, value?.id, "Account Group", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(accountGroupModel, { _id: value?.id }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Account Group"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Account Group"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllAccountGroup = async (req, res) => {
  reqInfo(req);
  try {
    let { page = 1, limit = 100, search, activeFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }];
    }

    const options: any = {
      sort: { name: 1 },
      populate: [
        {
          path: "parentGroupId",
          select: "name parentGroupId nature groupLevel",
          // populate: {
          //   path: "parentGroupId",
          //   select: "name parentGroupId",
          // },
        },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(accountGroupModel, criteria, {}, options);
    const totalData = await countData(accountGroupModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Account Group"), { accountGroup_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getOneAccountGroup = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getAccountGroupSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      accountGroupModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          {
            path: "parentGroupId",
            select: "name parentGroupId nature groupLevel",
          },
        ],
      },
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

export const getAccountGroupDropdown = async (req, res) => {
  reqInfo(req);
  try {
    let criteria: any = { isDeleted: false, isActive: true };

    const response = await getDataWithSorting(
      accountGroupModel,
      criteria,
      { _id: 1, name: 1 },
      {
        sort: { name: 1 },
      },
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Account Group"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
