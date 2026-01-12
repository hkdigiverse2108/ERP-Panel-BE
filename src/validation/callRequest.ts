import Joi from "joi";
import { baseApiSchema, commonContactSchema, objectId } from "./common";

export const addCallRequestSchema = Joi.object().keys({
  businessName: Joi.string().required(),
  contactName: Joi.string().required(),
  contactNo: commonContactSchema.required(),
  note: Joi.string().optional(),
  ...baseApiSchema,
});

export const editCallRequestSchema = Joi.object().keys({
  callRequestId: objectId().required(),
  businessName: Joi.string().optional(),
  contactName: Joi.string().optional(),
  contactNo: commonContactSchema.optional(),
  note: Joi.string().optional(),
  ...baseApiSchema,
});

export const deleteCallRequestSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getCallRequestSchema = Joi.object().keys({
  id: objectId().required(),
});
