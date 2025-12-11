import Joi from "joi";
import { objectId } from "./common";

export const addStockSchema = Joi.object().keys({
  companyId: objectId().optional(),
  productId: objectId().required(),
  variantId: objectId().optional(),
  batchNo: Joi.number().optional(),
  qty: Joi.number().optional(),
  mfgDate: Joi.string().optional(),
  expiryDate: Joi.string().optional(),
  sellingPrice: Joi.number().optional(),
  mrp: Joi.number().optional(),
});

export const editStockSchema = Joi.object().keys({
  stockId: objectId().required(),
  companyId: objectId().optional(),
  productId: objectId().required(),
  variantId: objectId().optional(),
  batchNo: Joi.number().optional(),
  qty: Joi.number().optional(),
  mfgDate: Joi.string().optional(),
  expiryDate: Joi.string().optional(),
  sellingPrice: Joi.number().optional(),
  mrp: Joi.number().optional(),
});

export const deleteStockSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getStockSchema = Joi.object().keys({
  id: objectId().required(),
});
