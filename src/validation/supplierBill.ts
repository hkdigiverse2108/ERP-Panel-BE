import Joi from "joi";
import { objectId } from "./common";

const supplierBillItemSchema = Joi.object().keys({
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

export const addSupplierBillSchema = Joi.object().keys({
  documentNo: Joi.string().optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  dueDate: Joi.date().optional().allow("", null),
  supplierId: objectId().required(),
  supplierName: Joi.string().optional(),
  purchaseOrderId: objectId().optional().allow("", null),
  materialInwardId: objectId().optional().allow("", null),
  items: Joi.array().items(supplierBillItemSchema).min(1).required(),
  grossAmount: Joi.number().min(0).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  netAmount: Joi.number().min(0).default(0).optional(),
  paidAmount: Joi.number().min(0).default(0).optional(),
  balanceAmount: Joi.number().min(0).default(0).optional(),
  paymentStatus: Joi.string().valid("paid", "unpaid", "partial").default("unpaid").optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("active", "draft", "cancelled").default("active").optional(),
});

export const editSupplierBillSchema = Joi.object().keys({
  supplierBillId: objectId().required(),
  documentNo: Joi.string().optional(),
  date: Joi.date().optional(),
  dueDate: Joi.date().optional().allow("", null),
  supplierId: objectId().optional(),
  supplierName: Joi.string().optional(),
  purchaseOrderId: objectId().optional().allow("", null),
  materialInwardId: objectId().optional().allow("", null),
  items: Joi.array().items(supplierBillItemSchema).optional(),
  grossAmount: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  taxAmount: Joi.number().min(0).optional(),
  roundOff: Joi.number().optional(),
  netAmount: Joi.number().min(0).optional(),
  paidAmount: Joi.number().min(0).optional(),
  balanceAmount: Joi.number().min(0).optional(),
  paymentStatus: Joi.string().valid("paid", "unpaid", "partial").optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid("active", "draft", "cancelled").optional(),
});

export const deleteSupplierBillSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getSupplierBillSchema = Joi.object().keys({
  id: objectId().required(),
});

