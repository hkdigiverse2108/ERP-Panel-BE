import { apiResponse, HTTP_STATUS } from "../../common";
import { messengerConfigModel } from "../../database";
import { checkBranch, checkCompany, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addMessengerConfigSchema } from "../../validation";

export const getConfig = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { branchFilter } = req.query;

    const branchId = await checkBranch(user, {});

    let criteria: any = { isDeleted: false };

    if (branchId) {
      criteria.branchId = branchId;
    } else if (branchFilter) {
      criteria.branchId = branchFilter;
    }

    const companyId = await checkCompany(user, {});
    if (companyId) criteria.companyId = companyId;

    const response = await getFirstMatch(messengerConfigModel, criteria, {}, {});
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Messenger Config"), response || {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const saveConfig = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = addMessengerConfigSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (!user.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);
    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;
    value.isConnected = true;
    value.connectedAt = new Date();

    const existing = await getFirstMatch(messengerConfigModel, { branchId: value.branchId, isDeleted: false }, {}, {});

    let response;
    if (existing) {
      response = await updateData(messengerConfigModel, { _id: existing._id }, value, {});
    } else {
      const { createOne } = require("../../helper");
      response = await createOne(messengerConfigModel, value);
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Messenger Config"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
