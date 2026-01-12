import Joi from "joi";
import { PRODUCT_REQUEST_STATUS, PRODUCT_TYPE } from "../common";
import { objectId } from "./common";

export const addProductRequestSchema = Joi.object().keys({
  name: Joi.string().required(),
  printName: Joi.string().optional(),

  category: Joi.string().optional(),
  subCategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  subBrand: Joi.string().optional(),

  productType: Joi.string()
    .valid(...Object.values(PRODUCT_TYPE))
    .default(PRODUCT_TYPE.FINISHED)
    .optional(),

  status: Joi.string()
    .valid(...Object.values(PRODUCT_REQUEST_STATUS))
    .default(PRODUCT_REQUEST_STATUS.PENDING)
    .optional(),

  hasExpiry: Joi.boolean().default(false).optional(),
  description: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
});

export const editProductRequestSchema = Joi.object().keys({
  productRequestId: objectId().required(),

  name: Joi.string().optional(),
  printName: Joi.string().optional(),

  category: Joi.string().optional(),
  subCategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  subBrand: Joi.string().optional(),

  productType: Joi.string()
    .valid(...Object.values(PRODUCT_TYPE))
    .default(PRODUCT_TYPE.FINISHED)
    .optional(),

  status: Joi.string()
    .valid(...Object.values(PRODUCT_REQUEST_STATUS))
    .optional(),

  hasExpiry: Joi.boolean().default(false).optional(),
  description: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
});

export const deleteProductRequestSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getProductRequestSchema = Joi.object().keys({
  id: objectId().required(),
});
