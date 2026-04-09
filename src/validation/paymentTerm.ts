import Joi from "joi";
import { baseCompanyApiSchema, objectId } from "./common";

export const addPaymentTermSchema = Joi.object().keys({
  name: Joi.string().trim().required(),
  day: Joi.number().integer().min(0).required(),
  ...baseCompanyApiSchema,
});

export const editPaymentTermSchema = Joi.object().keys({
  paymentTermId: objectId().required(),
  name: Joi.string().trim().optional(),
  day: Joi.number().integer().min(0).optional(),
  ...baseCompanyApiSchema,
});

export const deletePaymentTermSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getPaymentTermSchema = Joi.object().keys({
  id: objectId().required(),
});
