import Joi from "joi";
import { objectId } from "./common";

export const addStockSchema = Joi.object().keys({
  productId: objectId().required(),
  companyId: objectId().optional(),
  branchId: objectId().optional(),
  locationId: objectId().optional(),
  variantId: objectId().optional(),
  batchNo: Joi.string().optional(),
  qty: Joi.number().min(0).default(0),
  mfgDate: Joi.date().optional(),
  expiryDate: Joi.date().optional(),
  sellingPrice: Joi.number().min(0).optional(),
  mrp: Joi.number().min(0).optional(),
});

export const editStockSchema = Joi.object().keys({
  stockId: objectId().required(),
  companyId: objectId().optional(),
  branchId: objectId().optional(),
  locationId: objectId().optional(),
  productId: objectId().optional(),
  variantId: objectId().optional(),
  batchNo: Joi.string().optional(),
  qty: Joi.number().min(0).optional(),
  mfgDate: Joi.date().optional(),
  expiryDate: Joi.date().optional(),
  sellingPrice: Joi.number().min(0).optional(),
  mrp: Joi.number().min(0).optional(),
});

export const deleteStockSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getStockSchema = Joi.object().keys({
  id: objectId().required(),
});
