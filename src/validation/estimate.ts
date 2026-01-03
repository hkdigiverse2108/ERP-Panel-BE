import Joi from "joi";
import { objectId } from "./common";

const estimateItemSchema = Joi.object().keys({
  productId: objectId().required(),
  productName: Joi.string().required(),
  batchNo: Joi.string().optional().allow("", null),
  qty: Joi.number().min(0.01).required(),
  freeQty: Joi.number().min(0).default(0).optional(), // Sales items have freeQty
  uom: Joi.string().optional().allow("", null),
  price: Joi.number().min(0).required(),
  discountPercent: Joi.number().min(0).max(100).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxId: objectId().optional().allow("", null),
  taxPercent: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  taxableAmount: Joi.number().min(0).required(),
  totalAmount: Joi.number().min(0).required(),
});

export const addEstimateSchema = Joi.object().keys({
  documentNo: Joi.string().optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().required(),
  customerName: Joi.string().optional(),
  items: Joi.array().items(estimateItemSchema).min(1).required(),
  grossAmount: Joi.number().min(0).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  netAmount: Joi.number().min(0).default(0).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("pending", "converted", "cancelled").default("pending").optional(),
});

export const editEstimateSchema = Joi.object().keys({
  estimateId: objectId().required(),
  documentNo: Joi.string().optional(),
  date: Joi.date().optional(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().optional(),
  customerName: Joi.string().optional(),
  items: Joi.array().items(estimateItemSchema).optional(),
  grossAmount: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  taxAmount: Joi.number().min(0).optional(),
  roundOff: Joi.number().optional(),
  netAmount: Joi.number().min(0).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("pending", "converted", "cancelled").optional(),
});

export const deleteEstimateSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getEstimateSchema = Joi.object().keys({
  id: objectId().required(),
});

