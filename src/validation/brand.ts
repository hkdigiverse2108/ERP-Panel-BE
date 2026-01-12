import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addBrandSchema = Joi.object({
  name: Joi.string().trim().required(),
  code: Joi.string().trim().uppercase().required(),
  description: Joi.string().allow("").optional(),
  parentBrandId: objectId().optional(),
  image: Joi.string().allow("").optional(),
  ...baseApiSchema,
});

export const editBrandSchema = Joi.object({
  brandId: objectId().required(),
  name: Joi.string().trim().optional(),
  code: Joi.string().trim().uppercase().optional(),
  description: Joi.string().allow("").optional(),
  parentBrandId: objectId().optional(),
  image: Joi.string().allow("").optional(),
  ...baseApiSchema,
});

export const deleteBrandSchema = Joi.object({
  id: objectId().required(),
});

export const getBrandSchema = Joi.object({
  id: objectId().required(),
});
