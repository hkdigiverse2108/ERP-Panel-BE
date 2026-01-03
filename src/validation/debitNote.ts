import Joi from "joi";
import { objectId } from "./common";

const debitNoteItemSchema = Joi.object().keys({
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

export const addDebitNoteSchema = Joi.object().keys({
  documentNo: Joi.string().optional(),
  date: Joi.date().required(),
  supplierId: objectId().required(),
  supplierName: Joi.string().optional(),
  supplierBillId: objectId().optional().allow("", null),
  items: Joi.array().items(debitNoteItemSchema).min(1).required(),
  grossAmount: Joi.number().min(0).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  netAmount: Joi.number().min(0).default(0).optional(),
  reason: Joi.string().optional().allow("", null), // Model shows it's optional String
  status: Joi.string().valid("active", "draft", "cancelled").default("active").optional(),
});

export const editDebitNoteSchema = Joi.object().keys({
  debitNoteId: objectId().required(),
  documentNo: Joi.string().optional(),
  date: Joi.date().optional(),
  supplierId: objectId().optional(),
  supplierName: Joi.string().optional(),
  supplierBillId: objectId().optional().allow("", null),
  items: Joi.array().items(debitNoteItemSchema).optional(),
  grossAmount: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  taxAmount: Joi.number().min(0).optional(),
  roundOff: Joi.number().optional(),
  netAmount: Joi.number().min(0).optional(),
  reason: Joi.string().optional(),
  status: Joi.string().valid("active", "draft", "cancelled").optional(),
});

export const deleteDebitNoteSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getDebitNoteSchema = Joi.object().keys({
  id: objectId().required(),
});

