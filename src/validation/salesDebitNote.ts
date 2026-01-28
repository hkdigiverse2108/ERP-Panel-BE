import Joi from "joi";
import { objectId } from "./common";

const salesDebitNoteItemSchema = Joi.object().keys({
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

export const addSalesDebitNoteSchema = Joi.object().keys({
  documentNo: Joi.string().optional(),
  date: Joi.date().required(),
  supplierId: objectId().required(),
  supplierName: Joi.string().optional(),
  supplierBillId: objectId().optional().allow("", null),
  items: Joi.array().items(salesDebitNoteItemSchema).min(1).required(),
  grossAmount: Joi.number().min(0).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  netAmount: Joi.number().min(0).default(0).optional(),
  reason: Joi.string().optional().allow("", null), // Model shows it's optional String
  status: Joi.string().valid("active", "draft", "cancelled").default("active").optional(),
});

export const editSalesDebitNoteSchema = Joi.object().keys({
  salesDebitNoteId: objectId().required(),
  documentNo: Joi.string().optional(),
  date: Joi.date().optional(),
  customerId: objectId().optional(),
  customerName: Joi.string().optional(),
  invoiceId: objectId().optional().allow("", null),
  items: Joi.array().items(salesDebitNoteItemSchema).optional(),
  grossAmount: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  taxAmount: Joi.number().min(0).optional(),
  roundOff: Joi.number().optional(),
  netAmount: Joi.number().min(0).optional(),
  reason: Joi.string().optional().allow("", null),
  status: Joi.string().valid("active", "draft", "cancelled").optional(),
});

export const deleteSalesDebitNoteSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getSalesDebitNoteSchema = Joi.object().keys({
  id: objectId().required(),
});
