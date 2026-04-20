import Joi from "joi";
import { baseCompanyApiSchema, objectId } from "./common";
import { LOYALTY_TYPE, LOYALTY_REDEMPTION_TYPE } from "../common";

export const addLoyaltySchema = Joi.object().keys({
  ...baseCompanyApiSchema,

  name: Joi.string().required(),
  description: Joi.string().max(200).optional().allow("", null),
  type: Joi.string()
    .valid(...Object.values(LOYALTY_TYPE))
    .required(),
  discountValue: Joi.number().min(0).optional().allow("", null),
  redemptionPoints: Joi.number().min(0).optional().allow("", null),
  singleTimeUse: Joi.boolean().optional(),
  campaignLaunchDate: Joi.date().optional().allow("", null),
  campaignExpiryDate: Joi.date().optional().allow("", null),
  minimumPurchaseAmount: Joi.number().min(0).optional().allow("", null),
  usageLimit: Joi.number().min(1).optional().allow("", null),
});

export const editLoyaltySchema = Joi.object().keys({
  loyaltyId: objectId().required(),
  name: Joi.string().optional(),
  description: Joi.string().max(200).optional().allow("", null),
  type: Joi.string()
    .valid(...Object.values(LOYALTY_TYPE))
    .optional(),
  discountValue: Joi.number().min(0).optional().allow("", null),
  redemptionPoints: Joi.number().min(0).optional().allow("", null),
  singleTimeUse: Joi.boolean().optional(),
  campaignLaunchDate: Joi.date().optional(),
  campaignExpiryDate: Joi.date().optional().allow("", null),
  minimumPurchaseAmount: Joi.number().min(0).optional(),
  usageLimit: Joi.number().min(1).optional().allow("", null),
  ...baseCompanyApiSchema,
});

export const deleteLoyaltySchema = Joi.object().keys({
  id: objectId().required(),
});

export const getLoyaltySchema = Joi.object().keys({
  id: objectId().required(),
});

export const redeemLoyaltySchema = Joi.object().keys({
  loyaltyId: objectId().required(),
  customerId: objectId().required(),
  totalAmount: Joi.number().min(0).required(),
});

export const removeLoyaltySchema = Joi.object().keys({
  loyaltyId: objectId().required(),
  customerId: objectId().required(),
});

export const addLoyaltyPointsSchema = Joi.object().keys({
  companyId: objectId().optional(),
  amount: Joi.number().min(0).required(),
  points: Joi.number().min(0).required(),
});

export const getLoyaltyPointsSchema = Joi.object().keys({
  companyId: objectId().optional(),
});

