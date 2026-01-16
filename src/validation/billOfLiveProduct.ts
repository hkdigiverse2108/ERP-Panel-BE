import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

const ingredientSchema = Joi.object({
  productId: objectId().required(),
  batch: Joi.string().optional(),
  availableQty: Joi.number().optional(),
  useQty: Joi.number().required(),
});

const productDetailSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().required(),
  purchasePrice: Joi.number().optional(),
  landingCost: Joi.number().optional(),
  mrp: Joi.number().optional(),
  sellingPrice: Joi.number().optional(),
  mfgDate: Joi.string().optional(),
  expiryDays: Joi.number().optional(),
  expiryDate: Joi.string().optional(),
  batchNo: Joi.string().optional(),
  ingredients: Joi.array().items(ingredientSchema).optional(),
});

export const addBillOfLiveProductSchema = Joi.object().keys({
  ...baseApiSchema,

  date: Joi.string().required(),
  number: Joi.string().required(),

  recipeId: Joi.array().items(objectId()).optional(),

  allowReverseCalculation: Joi.boolean().optional(),

  productDetails: Joi.array().items(productDetailSchema).min(1).required(),
});

export const editBillOfLiveProductSchema = Joi.object().keys({
  billOfLiveProductId: objectId().required(),
  ...baseApiSchema,

  date: Joi.string().optional(),
  number: Joi.string().optional(),

  recipeId: Joi.array().items(objectId()).optional(),

  allowReverseCalculation: Joi.boolean().optional(),

  productDetails: Joi.array().items(productDetailSchema).optional(),
});

export const deleteBillOfLiveProductSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getBillOfLiveProductSchema = Joi.object().keys({
  id: objectId().required(),
});
