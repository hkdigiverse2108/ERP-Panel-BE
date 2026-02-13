import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { COUPON_DISCOUNT_TYPE, COUPON_STATUS } from "../common";

export const addCouponSchema = Joi.object().keys({
  name: Joi.string().trim().required(),
  // customerIds: Joi.array().optional().default([]),
  couponPrice: Joi.number().min(0).required(),
  redemptionType: Joi.string()
    .valid(...Object.values(COUPON_DISCOUNT_TYPE))
    .required(),
  redeemValue: Joi.number().min(0).required(),
  singleTimeUse: Joi.boolean().optional(),
  usageLimit: Joi.number().min(1).optional(),
  expiryDays: Joi.number().min(1).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref("startDate")).optional(),
  status: Joi.string()
    .valid(...Object.values(COUPON_STATUS))
    .default(COUPON_STATUS.ACTIVE)
    .optional(),
  ...baseApiSchema,
});

export const editCouponSchema = Joi.object().keys({
  couponId: objectId().required(),
  name: Joi.string().trim().optional(),
  // customerIds: Joi.array().optional(),
  couponPrice: Joi.number().min(0).optional(),
  redemptionType: Joi.string()
    .valid(...Object.values(COUPON_DISCOUNT_TYPE))
    .optional(),
  redeemValue: Joi.number().min(0).optional(),
  singleTimeUse: Joi.boolean().optional(),
  usageLimit: Joi.number().min(1).optional(),
  expiryDays: Joi.number().min(1).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref("startDate")).optional(),
  status: Joi.string()
    .valid(...Object.values(COUPON_STATUS))
    .optional(),
  ...baseApiSchema,
});

export const deleteCouponSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getCouponSchema = Joi.object().keys({
  id: objectId().required(),
});

export const applyCouponSchema = Joi.object().keys({
  couponId: objectId().required(),
  totalAmount: Joi.number().min(0).required(),
  customerId: objectId().required(),
});

export const removeCouponSchema = Joi.object().keys({
  couponId: objectId().required(),
  customerId: objectId().required(),
});
