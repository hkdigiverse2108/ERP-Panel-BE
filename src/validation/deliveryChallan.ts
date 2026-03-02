import Joi from "joi";
import { objectId } from "./common";

const deliveryChallanItemSchema = Joi.object().keys({
  productId: objectId().required(),
  qty: Joi.number().min(0).required(),
  freeQty: Joi.number().min(0).default(0).optional(),
  uomId: objectId().optional().allow(null),
  unit: Joi.string().optional().allow("", null),
  price: Joi.number().min(0).required(),
  discount1: Joi.number().min(0).default(0).optional(),
  discount2: Joi.number().min(0).default(0).optional(),
  taxId: objectId().optional().allow("", null),
  tax: Joi.number().min(0).optional(),
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

