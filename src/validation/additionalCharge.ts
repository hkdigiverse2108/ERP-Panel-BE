import Joi from "joi";
import { baseCompanyApiSchema, objectId } from "./common";
import { ADDITIONAL_CHARGE_TYPE } from "../common";

export const addAdditionalChargeSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(ADDITIONAL_CHARGE_TYPE))
    .required(),
  name: Joi.string().trim().required(),
  defaultValue: Joi.number().required(),
  taxId: objectId().optional().allow("", null),
  isTaxIncluding: Joi.boolean().optional(),
  hsnSac: Joi.string().trim().optional().allow(""),
  ...baseCompanyApiSchema,
});

export const editAdditionalChargeSchema = Joi.object({
  additionalChargeId: objectId().required(),
  type: Joi.string()
    .valid(...Object.values(ADDITIONAL_CHARGE_TYPE))
    .optional(),
  name: Joi.string().trim().optional(),
  defaultValue: Joi.number().optional(),
  taxId: objectId().optional().allow("", null),
  isTaxIncluding: Joi.boolean().optional(),
  hsnSac: Joi.string().trim().optional().allow(""),
  ...baseCompanyApiSchema,
});

export const deleteAdditionalChargeSchema = Joi.object({
  id: objectId().required(),
});

export const getAdditionalChargeSchema = Joi.object({
  id: objectId().required(),
});
