import { apiResponse, HTTP_STATUS } from "../../common";
import { contactModel, couponModel, PosOrderModel } from "../../database";
import { checkCompany, checkIdExist, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addCouponSchema, applyCouponSchema, deleteCouponSchema, editCouponSchema, getCouponSchema, removeCouponSchema } from "../../validation";
import { COUPON_DISCOUNT_TYPE, COUPON_STATUS } from "../../common";

const ObjectId = require("mongoose").Types.ObjectId;

export const addCoupon = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = addCouponSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    value.companyId = await checkCompany(user, value);

    if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

    const isExist = await getFirstMatch(couponModel, { name: value?.name, companyId: value.companyId, isDeleted: false }, {}, {});
    if (isExist) {
      return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Coupon Name"), {}, {}));
    }

    // Validate date range
    if (value.startDate && value.endDate && new Date(value.startDate) >= new Date(value.endDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Start date must be before end date", {}, {}));
    }

    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const response = await createOne(couponModel, value);

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Coupon"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
  }
};

export const editCoupon = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;

    const { error, value } = editCouponSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const isExist = await getFirstMatch(couponModel, { _id: value?.couponId, isDeleted: false }, {}, {});

    if (!isExist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Coupon"), {}, {}));
    }

    if (value.name && value.name !== isExist.name) {
      const nameExist = await getFirstMatch(couponModel, { name: value.name, companyId: isExist.companyId, isDeleted: false, _id: { $ne: value.couponId } }, {}, {});
      if (nameExist) {
        return res.status(HTTP_STATUS.CONFLICT).json(new apiResponse(HTTP_STATUS.CONFLICT, responseMessage?.dataAlreadyExist("Coupon Name"), {}, {}));
      }
    }

    const startDate = value.startDate || isExist.startDate;
    const endDate = value.endDate || isExist.endDate;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Start date must be before end date", {}, {}));
    }

    value.updatedBy = user?._id || null;

    const response = await updateData(couponModel, { _id: value?.couponId }, value, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Coupon"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Coupon"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteCoupon = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = deleteCouponSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    if (!(await checkIdExist(couponModel, value?.id, "Coupon", res))) return;

    const payload = {
      isDeleted: true,
      updatedBy: user?._id || null,
    };

    const response = await updateData(couponModel, { _id: new ObjectId(value?.id) }, payload, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Coupon"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Coupon"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllCoupon = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const companyId = user?.companyId?._id;
    let { page, limit, search, status, startDate, endDate, activeFilter, companyFilter } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 10;

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.companyId = companyId;
    }

    if (companyFilter) {
      criteria.companyId = companyFilter;
    }

    if (search) {
      criteria.name = { $regex: search, $options: "si" };
    }

    if (status) {
      criteria.status = status;
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        criteria.startDate = { $lte: end };
        criteria.endDate = { $gte: start };
      }
    }

    const options = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    };

    const response = await getDataWithSorting(couponModel, criteria, {}, options);
    const totalData = await countData(couponModel, criteria);

    const totalPages = Math.ceil(totalData / limit) || 1;

    const state = {
      page,
      limit,
      totalPages,
    };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Coupon"), { coupon_data: response, totalData, state }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getOneCoupon = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = getCouponSchema.validate(req.params);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const response = await getFirstMatch(couponModel, { _id: value?.id, isDeleted: false }, {}, {});

    if (!response) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Coupon"), {}, {}));
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Coupon"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const applyCoupon = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = applyCouponSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { couponId, totalAmount, customerId } = value;
    const companyId = user?.companyId?._id;

    if (!(await checkIdExist(contactModel, value.customerId, "Customer", res))) return;

    const coupon = await getFirstMatch(couponModel, { _id: couponId, companyId, isDeleted: false }, {}, {});

    if (!coupon) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Invalid coupon code", {}, {}));
    }

    if (coupon.status !== COUPON_STATUS.ACTIVE) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Coupon is ${coupon.status}`, {}, {}));
    }

    const now = new Date();

    // Check Start Date
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Coupon is not yet active", {}, {}));
    }

    // Check End Date
    if (coupon.endDate && now > new Date(coupon.endDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Coupon has expired", {}, {}));
    }

    // Check Expiry Days (from createdAt)
    if (coupon.expiryDays) {
      const expiryDate = new Date(coupon.createdAt);
      expiryDate.setDate(expiryDate.getDate() + coupon.expiryDays);
      if (now > expiryDate) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Coupon has expired based on expiry days", {}, {}));
      }
    }

    // Check Global Usage Limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Coupon usage limit reached", {}, {}));
    }

    // Check Single Time Use (Per Customer)
    if (coupon.singleTimeUse) {
      const hasUsed = coupon.customerIds && coupon.customerIds.some((item: any) => item.id.toString() === customerId.toString());
      if (hasUsed) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "You have already used this coupon", {}, {}));
      }
    }

    // Check Minimum Amount (couponPrice)
    if (coupon.couponPrice && totalAmount < coupon.couponPrice) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, `Minimum amount required to use this coupon is ${coupon.couponPrice}`, {}, {}));
    }

    // Calculate Discount
    let discountAmount = 0;
    if (coupon.redemptionType === COUPON_DISCOUNT_TYPE.PERCENTAGE) {
      discountAmount = (totalAmount * coupon.redeemValue) / 100;
    } else if (coupon.redemptionType === COUPON_DISCOUNT_TYPE.FLAT) {
      discountAmount = coupon.redeemValue;
    }

    // Ensure discount doesn't exceed total amount
    discountAmount = Math.min(discountAmount, totalAmount);

    const result = {
      couponId: coupon._id,
      name: coupon.name,
      discountAmount,
      finalAmount: totalAmount - discountAmount,
      redemptionType: coupon.redemptionType,
      redeemValue: coupon.redeemValue,
    };

    // Update Coupon usage
    const customerEntry = coupon.customerIds ? coupon.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;

    if (customerEntry) {
      await couponModel.updateOne({ _id: couponId, "customerIds.id": customerId }, { $inc: { "customerIds.$.count": 1, usedCount: 1 } });
    } else {
      await couponModel.updateOne({ _id: couponId }, { $push: { customerIds: { id: customerId, count: 1 } }, $inc: { usedCount: 1 } });
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Coupon applied successfully", result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const removeCoupon = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const { error, value } = removeCouponSchema.validate(req.body);

    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
    }

    const { couponId, customerId } = value;
    const companyId = user?.companyId?._id;

    const coupon = await getFirstMatch(couponModel, { _id: couponId, companyId, isDeleted: false }, {}, {});

    if (!coupon) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Coupon not found", {}, {}));
    }

    // Check if customer actually used it
    const customerEntry = coupon.customerIds ? coupon.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;
    if (!customerEntry) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Customer has not applied this coupon", {}, {}));
    }

    // Update Coupon: decrement usedCount and remove/decrement customerId count
    if (customerEntry.count > 1) {
      await couponModel.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
      await couponModel.updateOne({ _id: couponId, "customerIds.id": customerId }, { $inc: { "customerIds.$.count": -1 } });
    } else {
      await couponModel.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
      await couponModel.updateOne({ _id: couponId }, { $pull: { customerIds: { id: customerId } } });
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Coupon removed successfully", {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
