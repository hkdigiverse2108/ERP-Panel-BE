import Joi from "joi";
import { objectId } from "./common";

const stockVerificationSchema = Joi.object({
  productId: objectId().required(),
  batchId: objectId().required(),

  landingCost: Joi.number().required(),
  price: Joi.number().required(),
  mrp: Joi.number().required(),
  sellingPrice: Joi.number().required(),

  systemQty: Joi.number().required(),
  physicalQty: Joi.number().required(),

  differenceQty: Joi.number().required(),
  differenceAmount: Joi.number().required(),
});

export const addStockVerificationSchema = Joi.object({
  companyId: objectId().required(),
  branchId: objectId().required(),

  departmentId: objectId().optional(),
  categoryId: objectId().optional(),
  brandId: objectId().optional(),

  remark: Joi.string().allow("").optional(),
  focusOn: Joi.string().valid("PhysicalQty", "SystemQty").required(),

  items: Joi.array().items(stockVerificationSchema).min(1).required(),
});

export const getStockVerificationSchema = Joi.object({
  id: objectId().required(),
});

export const deleteStockVerificationSchema = Joi.object({
  id: objectId().required(),
});
