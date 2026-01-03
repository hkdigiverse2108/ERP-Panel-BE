import Joi from "joi";
import { objectId } from "./common";

const deliveryChallanItemSchema = Joi.object().keys({
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

export const addDeliveryChallanSchema = Joi.object().keys({
  documentNo: Joi.string().optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  customerId: objectId().required(),
  customerName: Joi.string().optional(),
  invoiceId: objectId().optional().allow("", null),
  items: Joi.array().items(deliveryChallanItemSchema).min(1).required(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("pending", "completed", "cancelled").default("pending").optional(),
});

export const editDeliveryChallanSchema = Joi.object().keys({
  deliveryChallanId: objectId().required(),
  documentNo: Joi.string().optional(),
  date: Joi.date().optional(),
  customerId: objectId().optional(),
  customerName: Joi.string().optional(),
  invoiceId: objectId().optional().allow("", null),
  items: Joi.array().items(deliveryChallanItemSchema).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("pending", "completed", "cancelled").optional(),
});

export const deleteDeliveryChallanSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getDeliveryChallanSchema = Joi.object().keys({
  id: objectId().required(),
});

