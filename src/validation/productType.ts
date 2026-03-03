import Joi from "joi";
import { objectId } from "./common";

export const addProductTypeSchema = Joi.object({
  name: Joi.string().trim().required(),
  isActive: Joi.boolean().optional(),
});

export const editProductTypeSchema = Joi.object({
  productTypeId: objectId().required(),
  name: Joi.string().trim().optional(),
  isActive: Joi.boolean().optional(),
});

export const deleteProductTypeSchema = Joi.object({
  id: objectId().required(),
});

export const getProductTypeSchema = Joi.object({
  id: objectId().required(),
});
