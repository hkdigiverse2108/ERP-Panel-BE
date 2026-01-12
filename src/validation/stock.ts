import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addStockSchema = Joi.object().keys({
  productId: objectId().required(),
  companyId: objectId().required(),
  branchId: objectId().optional(),
  variantId: objectId().optional(),
  qty: Joi.number().min(0).default(0),
  purchasePrice: Joi.number().min(0).default(0),
  landingCost: Joi.number().min(0).default(0),
  mrp: Joi.number().min(0).default(0),
  sellingDiscount: Joi.number().min(0).default(0),
  sellingPrice: Joi.number().min(0).default(0),
  sellingMargin: Joi.number().min(0).default(0),
  ...baseApiSchema,
});

export const editStockSchema = Joi.object().keys({
  stockId: objectId().required(),
  companyId: objectId().optional(),
  branchId: objectId().optional(),
  productId: objectId().optional(),
  variantId: objectId().optional(),
  batchNo: Joi.string().optional(),
  qty: Joi.number().min(0).optional(),
  mfgDate: Joi.date().optional(),
  expiryDate: Joi.date().optional(),
  sellingPrice: Joi.number().min(0).optional(),
  mrp: Joi.number().min(0).optional(),
  ...baseApiSchema,
});

export const deleteStockSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getStockSchema = Joi.object().keys({
  id: objectId().required(),
});
