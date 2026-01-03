import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { accountGroupModel } from "../../database/model";
import { countData, getDataWithSorting, reqInfo, responseMessage } from "../../helper";

export const getAllAccountGroup = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page = 1, limit = 100, search, isActive } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (isActive !== undefined) {
      criteria.isActive = isActive === "true";
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const options: any = {
      sort: { name: 1 },
      populate: [
        { path: "parentGroupId", select: "name" },
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

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Account Group"), { accountGroup_data: response, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

// Dropdown API - returns only active account groups in { _id, name } format
export const getAccountGroupDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    const response = await getDataWithSorting(
      accountGroupModel,
      criteria,
      { _id: 1, name: 1 },
      {
        sort: { name: 1 },
      }
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

