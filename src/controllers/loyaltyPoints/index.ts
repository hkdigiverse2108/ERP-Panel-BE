import { apiResponse, HTTP_STATUS } from "../../common";
import { loyaltyPointsModel } from "../../database";
import { checkCompany, getFirstMatch, reqInfo, responseMessage } from "../../helper";
import { addLoyaltyPointsSchema, getLoyaltyPointsSchema } from "../../validation";

export const addOrUpdateLoyaltyPoints = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addLoyaltyPointsSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    const isExist = await getFirstMatch(loyaltyPointsModel, { companyId: value.companyId }, {}, {});

    if (!isExist) {
      value.createdBy = user?._id || null;
    }
    value.updatedBy = user?._id || null;
    let response = await loyaltyPointsModel.findOneAndUpdate({ companyId: value.companyId }, value, { new: true, upsert: true });

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, isExist ? responseMessage?.updateDataError("Loyalty Points") : responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, isExist ? responseMessage?.updateDataSuccess("Loyalty Points") : responseMessage?.addDataSuccess("Loyalty Points"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getLoyaltyPoints = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const userCompanyId = user?.companyId?._id;

    let { error, value } = getLoyaltyPointsSchema.validate(req.query);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const companyId = userCompanyId || value?.companyFilter;

    if (!companyId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
    }

    const response = await getFirstMatch(
      loyaltyPointsModel,
      { companyId: companyId },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
        ],
      },
    );

    // if (!response) {
    //   return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Loyalty Points"), {}, {}));
    // }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Loyalty Points"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
