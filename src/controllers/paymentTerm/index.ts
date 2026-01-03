import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { paymentTermModel } from "../../database/model";
import { countData, getDataWithSorting, reqInfo, responseMessage } from "../../helper";

export const getAllPaymentTerm = async (req, res) => {
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
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(paymentTermModel, criteria, {}, options);
    const totalData = await countData(paymentTermModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Payment Term"), { paymentTerm_data: response, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

// Dropdown API - returns only active payment terms in { _id, name } format
export const getPaymentTermDropdown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    const response = await getDataWithSorting(
      paymentTermModel,
      criteria,
      { _id: 1, name: 1, days: 1 },
      {
        sort: { name: 1 },
      }
    );

    const dropdownData = response.map((item) => ({
      _id: item._id,
      name: item.name,
      days: item.days,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Payment Term"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

