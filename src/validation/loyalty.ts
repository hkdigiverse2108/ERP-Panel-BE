import Joi from "joi";
import { objectId } from "./common";
import { LOYALTY_TYPE, LOYALTY_STATUS } from "../common";

export const addLoyaltySchema = Joi.object().keys({
  name: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(LOYALTY_TYPE))
    .required(),
  earningRatio: Joi.number().min(0).required(),
  redemptionRatio: Joi.number().min(0).required(),
  minRedemptionPoints: Joi.number().min(0).optional().allow("", null),
  status: Joi.string()
    .valid(...Object.values(LOYALTY_STATUS))
    .default(LOYALTY_STATUS.ACTIVE)
    .optional(),
});

export const editLoyaltySchema = Joi.object().keys({
  loyaltyId: objectId().required(),
  name: Joi.string().optional(),
  type: Joi.string()
    .valid(...Object.values(LOYALTY_TYPE))
    .optional(),
  earningRatio: Joi.number().min(0).optional(),
  redemptionRatio: Joi.number().min(0).optional(),
  minRedemptionPoints: Joi.number().min(0).optional().allow("", null),
  status: Joi.string()
    .valid(...Object.values(LOYALTY_STATUS))
    .optional(),
});

export const deleteLoyaltySchema = Joi.object().keys({
  id: objectId().required(),
});

export const getLoyaltySchema = Joi.object().keys({
  id: objectId().required(),
});

