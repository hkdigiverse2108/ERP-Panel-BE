import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { ADDITIONAL_CHARGE_TYPE } from "../common";

export const addAdditionalChargeSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(ADDITIONAL_CHARGE_TYPE))
    .required(),
  name: Joi.string().trim().required(),
  defaultValue: Joi.object({
    value: Joi.number().required(),
    type: Joi.string().required(),
  }).required(),
  taxId: objectId().optional().allow("", null),
  isTaxIncluding: Joi.boolean().optional(),
  accountGroupId: objectId().optional().allow("", null),
  hsnSac: Joi.string().trim().optional().allow(""),
  ...baseApiSchema,
});

export const editAdditionalChargeSchema = Joi.object({
  additionalChargeId: objectId().required(),
  type: Joi.string()
    .valid(...Object.values(ADDITIONAL_CHARGE_TYPE))
    .optional(),
  name: Joi.string().trim().optional(),
  defaultValue: Joi.object({
    value: Joi.number().optional(),
    type: Joi.string().optional(),
  }).optional(),
  taxId: objectId().optional().allow("", null),
  isTaxIncluding: Joi.boolean().optional(),
  accountGroupId: objectId().optional().allow("", null),
  hsnSac: Joi.string().trim().optional().allow(""),
  ...baseApiSchema,
});

export const deleteAdditionalChargeSchema = Joi.object({
  id: objectId().required(),
});

export const getAdditionalChargeSchema = Joi.object({
  id: objectId().required(),
});
