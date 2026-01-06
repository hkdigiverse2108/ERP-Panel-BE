import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { taxModel } from "../../database/model";
import { countData, getDataWithSorting, reqInfo, responseMessage } from "../../helper";

export const getAllTax = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page = 1, limit = 100, search, activeFilter, type } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (type) {
      criteria.type = type;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const options: any = {
      sort: { name: 1 },
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(taxModel, criteria, {}, options);
    const totalData = await countData(taxModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Tax"), { tax_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

// Dropdown API - returns only active taxes in { _id, name, percentage, type } format
export const getTaxDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    const { type } = req.query; // Optional filter by type (purchase/sales)

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (type) {
      criteria.type = type;
    }

    const response = await getDataWithSorting(
      taxModel,
      criteria,
      { _id: 1, name: 1, percentage: 1, type: 1 },
      {
        sort: { name: 1 },
      }
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      percentage: item.percentage,
      type: item.type,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Tax"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
