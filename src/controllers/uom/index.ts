import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { UOMModel } from "../../database/model";
import { countData, getDataWithSorting, reqInfo, responseMessage } from "../../helper";

export const getAllUOM = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let { page = 1, limit = 100, search, activeFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "i" } }, { code: { $regex: search, $options: "i" } }];
    }

    const options: any = {
      sort: { name: 1 },
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(UOMModel, criteria, {}, options);
    const totalData = await countData(UOMModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("UOM"), { uom_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

// Dropdown API - returns only active UOMs in { _id, name, code } format
export const getUOMDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    const response = await getDataWithSorting(
      UOMModel,
      criteria,
      { _id: 1, name: 1, code: 1 },
      {
        sort: { name: 1 },
      }
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      code: item.code,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("UOM"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};
