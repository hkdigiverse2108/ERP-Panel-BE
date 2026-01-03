import Joi from "joi";
import { objectId } from "./common";
import { COUPON_DISCOUNT_TYPE, COUPON_STATUS } from "../common";

export const addCouponSchema = Joi.object().keys({
  code: Joi.string().required(),
  description: Joi.string().optional().allow("", null),
  discountType: Joi.string()
    .valid(...Object.values(COUPON_DISCOUNT_TYPE))
    .required(),
  discountValue: Joi.number().min(0).required(),
  minOrderValue: Joi.number().min(0).optional().allow("", null),
  maxDiscountAmount: Joi.number().min(0).optional().allow("", null),
  validFrom: Joi.date().required(),
  validTo: Joi.date().required(),
  usageLimit: Joi.number().min(0).optional().allow("", null),
  usedCount: Joi.number().min(0).default(0).optional(),
  status: Joi.string()
    .valid(...Object.values(COUPON_STATUS))
    .default(COUPON_STATUS.ACTIVE)
    .optional(),
});

export const editCouponSchema = Joi.object().keys({
  couponId: objectId().required(),
  code: Joi.string().optional(),
  description: Joi.string().optional().allow("", null),
  discountType: Joi.string()
    .valid(...Object.values(COUPON_DISCOUNT_TYPE))
    .optional(),
  discountValue: Joi.number().min(0).optional(),
  minOrderValue: Joi.number().min(0).optional().allow("", null),
  maxDiscountAmount: Joi.number().min(0).optional().allow("", null),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional(),
  usageLimit: Joi.number().min(0).optional().allow("", null),
  usedCount: Joi.number().min(0).optional(),
  status: Joi.string()
    .valid(...Object.values(COUPON_STATUS))
    .optional(),
});

export const deleteCouponSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getCouponSchema = Joi.object().keys({
  id: objectId().required(),
});
