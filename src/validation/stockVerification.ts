import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

const stockVerificationItemSchema = Joi.object().keys({
  productId: objectId().required(),
  batchNo: Joi.string().optional(),
  landingCost: Joi.number().min(0).default(0),
  price: Joi.number().min(0).default(0),
  mrp: Joi.number().min(0).default(0),
  sellingPrice: Joi.number().min(0).default(0),
  unit: Joi.string().optional(),
  systemQty: Joi.number().default(0),
  physicalQty: Joi.number().required().min(0),
  differenceQty: Joi.number().default(0),
  differenceAmount: Joi.number().default(0),
});

export const addStockVerificationSchema = Joi.object().keys({
  verificationDate: Joi.date().required(),
  departmentId: objectId().optional(),
  categoryId: objectId().optional(),
  brandId: objectId().optional(),
  remark: Joi.string().optional(),
  items: Joi.array().items(stockVerificationItemSchema).min(1).required(),
  status: Joi.string().valid("pending", "approved", "rejected").default("pending"),
  ...baseApiSchema,
});

export const editStockVerificationSchema = Joi.object().keys({
  stockVerificationId: objectId().required(),
  verificationDate: Joi.date().optional(),
  departmentId: objectId().optional(),
  categoryId: objectId().optional(),
  brandId: objectId().optional(),
  remark: Joi.string().optional(),
  items: Joi.array().items(stockVerificationItemSchema).optional(),
  approvedQty: Joi.number().optional(),
  status: Joi.string().valid("pending", "approved", "rejected").optional(),
  ...baseApiSchema,
});

export const deleteStockVerificationSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getStockVerificationSchema = Joi.object().keys({
  id: objectId().required(),
});
