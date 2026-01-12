import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addTaxSchema = Joi.object({
  name: Joi.string().trim().required(),
  percentage: Joi.number(),
  ...baseApiSchema,
});

export const editTaxSchema = Joi.object({
  taxId: objectId().required(),
  name: Joi.string().trim().optional(),
  percentage: Joi.number(),
  ...baseApiSchema,
});

export const deleteTaxSchema = Joi.object({
  id: objectId().required(),
});

export const getTaxSchema = Joi.object({
  id: objectId().required(),
});
