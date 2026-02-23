import { apiResponse, HTTP_STATUS, LOYALTY_REDEMPTION_TYPE, LOYALTY_STATUS, LOYALTY_TYPE } from "../../common";
import { contactModel, loyaltyModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addLoyaltySchema, deleteLoyaltySchema, editLoyaltySchema, getLoyaltySchema, redeemLoyaltySchema, removeLoyaltySchema } from "../../validation";


const ObjectId = require("mongoose").Types.ObjectId;

export const addLoyalty = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addLoyaltySchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    // Check if loyalty campaign name already exists
    const isExist = await getFirstMatch(loyaltyModel, { name: value?.name, companyId: value.companyId, isDeleted: false }, {}, {});
    if (isExist) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Loyalty Campaign Name"), {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(loyaltyModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Loyalty Campaign"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const editLoyalty = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editLoyaltySchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(loyaltyModel, { _id: value?.loyaltyId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Loyalty Campaign"), {}, {}));
    }

    // Check if loyalty campaign name already exists (if being changed)
    if (value.name && value.name !== isExist.name) {
      console.log("value.name", value.name);
      console.log("isExist.name", isExist.name);
      const nameExist = await getFirstMatch(loyaltyModel, { name: value.name, companyId: isExist.companyId, isDeleted: false, _id: { $ne: value.loyaltyId } }, {}, {});
      if (nameExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Loyalty Campaign Name"), {}, {}));
      }
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(loyaltyModel, { _id: value?.loyaltyId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Loyalty Campaign"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Loyalty Campaign"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteLoyalty = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteLoyaltySchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(loyaltyModel, value?.id, "Loyalty Campaign", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(loyaltyModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Loyalty Campaign"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Loyalty Campaign"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllLoyalty = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, type, status, activeFilter, companyFilter } = req.query;

    page = Number(page);
    limit = Number(limit);

    let criteria: any = { isDeleted: false };
    if (companyId) {
      criteria.companyId = companyId;
    }
    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.$or = [{ name: { $regex: search, $options: "si" } }];
    }

    if (activeFilter !== undefined) criteria.isActive = activeFilter == "true";

    if (type) {
      criteria.type = type;
    }

    if (status) {
      criteria.status = status;
    }

    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: "companyId", select: "name" },
        { path: "branchId", select: "name" },
        { path: "customerIds.id", select: "firstName lastName" },
      ],
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(loyaltyModel, criteria, {}, options);
    const totalData = await countData(loyaltyModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Loyalty Campaign"), { loyalty_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneLoyalty = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getLoyaltySchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(
      loyaltyModel,
      { _id: value?.id, isDeleted: false },
      {},
      {
        populate: [
          { path: "companyId", select: "name" },
          { path: "branchId", select: "name" },
          { path: "customerIds.id", select: "firstName lastName" },
        ],
      },
    );

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Loyalty Campaign"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Loyalty Campaign"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const redeemLoyalty = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = redeemLoyaltySchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { loyaltyId, customerId, totalAmount } = value;
    const companyId = user?.companyId?._id;

    if (!(await checkIdExist(contactModel, customerId, "Customer", res))) return;

    const loyalty = await getFirstMatch(loyaltyModel, { _id: loyaltyId, companyId, isDeleted: false }, {}, {});

    if (!loyalty) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Loyalty campaign not found", {}, {}));
    }

    if (!loyalty.isActive) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Loyalty campaign is inactive`, {}, {}));
    }

    const now = new Date();

    // Check Launch Date
    if (loyalty.campaignLaunchDate && now < new Date(loyalty.campaignLaunchDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Loyalty campaign is not yet active", {}, {}));
    }

    // Check Expiry Date
    if (loyalty.campaignExpiryDate && now > new Date(loyalty.campaignExpiryDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Loyalty campaign has expired", {}, {}));
    }

    // Check Minimum Purchase Amount
    if (loyalty.minimumPurchaseAmount && totalAmount < loyalty.minimumPurchaseAmount) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Minimum amount required to use this campaign is ${loyalty.minimumPurchaseAmount}`, {}, {}));
    }

    // Check Global Usage Limit
    if (loyalty.usageLimit && loyalty.usedCount >= loyalty.usageLimit) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Loyalty campaign usage limit reached", {}, {}));
    }

    // Check Single Time Use (Per Customer)
    if (loyalty.singleTimeUse) {
      const hasUsed = loyalty.customerIds && loyalty.customerIds.some((item: any) => item.id.toString() === customerId.toString());
      if (hasUsed) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "You have already used this loyalty campaign", {}, {}));
      }
    }

    // Calculate Benefits (based on type)
    let benefit: any = {
      loyaltyId: loyalty._id,
      name: loyalty.name,
      type: loyalty.type,
    };

    if (loyalty.type === LOYALTY_TYPE.DISCOUNT) {
      benefit.discountValue = loyalty.discountValue || 0;
    } else if (loyalty.type === LOYALTY_TYPE.FREE_PRODUCT) {
      benefit.discountValue = loyalty.redemptionPoints || 0;
    }

    // Update Loyalty usage
    // const customerEntry = loyalty.customerIds ? loyalty.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;

    // if (customerEntry) {
    //   await loyaltyModel.updateOne({ _id: loyaltyId, "customerIds.id": customerId }, { $inc: { "customerIds.$.count": 1, usedCount: 1 } });
    // } else {
    //   await loyaltyModel.updateOne({ _id: loyaltyId }, { $push: { customerIds: { id: customerId, count: 1 } }, $inc: { usedCount: 1 } });
    // }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Loyalty campaign redeemed successfully", benefit, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const removeLoyalty = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = removeLoyaltySchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { loyaltyId, customerId } = value;
    const companyId = user?.companyId?._id;

    const loyalty = await getFirstMatch(loyaltyModel, { _id: loyaltyId, companyId, isDeleted: false }, {}, {});

    if (!loyalty) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Loyalty campaign not found", {}, {}));
    }

    // Check if customer actually used it
    const customerEntry = loyalty.customerIds ? loyalty.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;
    if (!customerEntry) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Customer has not used this loyalty campaign", {}, {}));
    }

    // Update Loyalty: decrement usedCount and remove/decrement customerId count
    // if (customerEntry.count > 1) {
    //   await loyaltyModel.updateOne({ _id: loyaltyId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    //   await loyaltyModel.updateOne({ _id: loyaltyId, "customerIds.id": customerId }, { $inc: { "customerIds.$.count": -1 } });
    // } else {
    //   await loyaltyModel.updateOne({ _id: loyaltyId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    //   await loyaltyModel.updateOne({ _id: loyaltyId }, { $pull: { customerIds: { id: customerId } } });
    // }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Loyalty campaign removed successfully", {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const loyaltyDropDown = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;

    const { search, customerId, totalAmount, companyFilter } = req.query;

    let criteria: any = { isDeleted: false, isActive: true };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.name = { $regex: search, $options: "si" };
    }

    const now = new Date();
    criteria.$and = [
      { $or: [{ campaignExpiryDate: { $exists: false } }, { campaignExpiryDate: null }, { campaignExpiryDate: { $gte: now } }] },
      { $or: [{ usageLimit: { $exists: false } }, { usageLimit: null }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] },
    ];

    if (totalAmount) {
      criteria.$and.push({ $or: [{ minimumPurchaseAmount: { $exists: false } }, { minimumPurchaseAmount: null }, { minimumPurchaseAmount: { $lte: totalAmount } }] });
    }

    if (customerId) {
      // filter out if singleTimeUse and already used by this customer
      criteria.$and.push({
        $or: [{ singleTimeUse: false }, { "customerIds.id": { $ne: new ObjectId(customerId) } }],
      });
    }

    const response = await loyaltyModel.find(criteria, { name: 1, type: 1, minimumPurchaseAmount: 1, }).sort({ name: 1 }).limit(100);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Loyalty Dropdown"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

