import Joi from "joi";
import { objectId } from "./common";

const salesOrderItemSchema = Joi.object().keys({
  productId: objectId().required(),
  productName: Joi.string().required(),
  batchNo: Joi.string().optional().allow("", null),
  qty: Joi.number().min(0.01).required(),
  freeQty: Joi.number().min(0).default(0).optional(),
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

export const addSalesOrderSchema = Joi.object().keys({
  documentNo: Joi.string().optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().required(),
  customerName: Joi.string().optional(),
  items: Joi.array().items(salesOrderItemSchema).min(1).required(),
  grossAmount: Joi.number().min(0).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  netAmount: Joi.number().min(0).default(0).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("pending", "completed", "cancelled").default("pending").optional(),
});

export const editSalesOrderSchema = Joi.object().keys({
  salesOrderId: objectId().required(),
  documentNo: Joi.string().optional(),
  date: Joi.date().optional(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().optional(),
  customerName: Joi.string().optional(),
  items: Joi.array().items(salesOrderItemSchema).optional(),
  grossAmount: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  taxAmount: Joi.number().min(0).optional(),
  roundOff: Joi.number().optional(),
  netAmount: Joi.number().min(0).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("pending", "completed", "cancelled").optional(),
});

export const deleteSalesOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getSalesOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

