import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addCategorySchema = Joi.object({
  name: Joi.string().trim().required(),
  code: Joi.string().trim().uppercase().required(),
  description: Joi.string().allow("").optional(),
  parentCategoryId: objectId().optional(),
  image: Joi.string().allow("").optional(),
  ...baseApiSchema,
});

export const editCategorySchema = Joi.object({
  categoryId: objectId().required(),
  name: Joi.string().trim().optional(),
  code: Joi.string().trim().uppercase().optional(),
  description: Joi.string().allow("").optional(),
  parentCategoryId: objectId().optional(),
  image: Joi.string().allow("").optional(),
  ...baseApiSchema,
});

export const deleteCategorySchema = Joi.object({
  id: objectId().required(),
});

export const getCategorySchema = Joi.object({
  id: objectId().required(),
});
