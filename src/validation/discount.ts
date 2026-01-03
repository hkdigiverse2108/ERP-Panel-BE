import Joi from "joi";
import { objectId } from "./common";
import { DISCOUNT_TYPE, DISCOUNT_STATUS } from "../common";

export const addDiscountSchema = Joi.object().keys({
  title: Joi.string().required(),
  validFrom: Joi.date().required(),
  validTo: Joi.date().required(),
  discountType: Joi.string()
    .valid(...Object.values(DISCOUNT_TYPE))
    .default(DISCOUNT_TYPE.PERCENTAGE)
    .optional(),
  discountValue: Joi.number().min(0).required(),
  status: Joi.string()
    .valid(...Object.values(DISCOUNT_STATUS))
    .default(DISCOUNT_STATUS.ACTIVE)
    .optional(),
});

export const editDiscountSchema = Joi.object().keys({
  discountId: objectId().required(),
  title: Joi.string().optional(),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional(),
  discountType: Joi.string()
    .valid(...Object.values(DISCOUNT_TYPE))
    .optional(),
  discountValue: Joi.number().min(0).optional(),
  status: Joi.string()
    .valid(...Object.values(DISCOUNT_STATUS))
    .optional(),
});

export const deleteDiscountSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getDiscountSchema = Joi.object().keys({
  id: objectId().required(),
});

