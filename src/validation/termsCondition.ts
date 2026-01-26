import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addTermsConditionSchema = Joi.object({
  termsCondition: Joi.string().trim().required(),
  isDefault: Joi.boolean().optional(),
  ...baseApiSchema,
});

export const editTermsConditionSchema = Joi.object({
  termsConditionId: objectId().required(),
  termsCondition: Joi.string().trim().optional(),
  isDefault: Joi.boolean().optional(),
  ...baseApiSchema,
});

export const deleteTermsConditionSchema = Joi.object({
  id: objectId().required(),
});

export const getTermsConditionSchema = Joi.object({
  id: objectId().required(),
});
