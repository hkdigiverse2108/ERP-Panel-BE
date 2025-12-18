import Joi from "joi";
import { objectId } from "./common";

export const addBrandSchema = Joi.object({
  name: Joi.string().trim().required(),
  code: Joi.string().trim().uppercase().required(),
  description: Joi.string().allow("").optional(),
  parentBrandId: objectId().optional(),
  image: Joi.string().allow("").optional(),
});

export const editBrandSchema = Joi.object({
  id: objectId().required(),
  name: Joi.string().trim().optional(),
  code: Joi.string().trim().uppercase().optional(),
  description: Joi.string().allow("").optional(),
  parentBrandId: objectId().optional(),
  image: Joi.string().allow("").optional(),
});

export const deleteBrandSchema = Joi.object({
  id: objectId().required(),
});

export const getBrandSchema = Joi.object({
  id: objectId().required(),
});
