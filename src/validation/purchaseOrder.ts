import Joi from "joi";
import { objectId } from "./common";

const purchaseOrderItemSchema = Joi.object().keys({
  productId: objectId().required(),
  productName: Joi.string().required(),
  batchNo: Joi.string().optional().allow("", null),
  qty: Joi.number().min(0.01).required(),
  receivedQty: Joi.number().min(0).default(0).optional(),
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

export const addPurchaseOrderSchema = Joi.object().keys({
  documentNo: Joi.string().optional(),
  date: Joi.date().required(),
  supplyDate: Joi.date().optional().allow("", null),
  supplierId: objectId().required(),
  supplierName: Joi.string().optional(),
  items: Joi.array().items(purchaseOrderItemSchema).min(1).required(),
  grossAmount: Joi.number().min(0).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  netAmount: Joi.number().min(0).default(0).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("pending", "received", "cancelled", "completed", "partially_delivered", "exceed").default("pending").optional(),
});

export const editPurchaseOrderSchema = Joi.object().keys({
  purchaseOrderId: objectId().required(),
  documentNo: Joi.string().optional(),
  date: Joi.date().optional(),
  supplyDate: Joi.date().optional().allow("", null),
  supplierId: objectId().optional(),
  supplierName: Joi.string().optional(),
  items: Joi.array().items(purchaseOrderItemSchema).optional(),
  grossAmount: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  taxAmount: Joi.number().min(0).optional(),
  roundOff: Joi.number().optional(),
  netAmount: Joi.number().min(0).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("pending", "received", "cancelled", "completed", "partially_delivered", "exceed").optional(),
});

export const deletePurchaseOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getPurchaseOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

