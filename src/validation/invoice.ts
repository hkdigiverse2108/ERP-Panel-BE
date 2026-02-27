import Joi from "joi";
import { objectId, transectionSummarySchema, commonAdditionalChargeSchema } from "./common";
import { INVOICE_STATUS, PAYMENT_TERMS_ENUM, TAX_TYPE, INVOICE_CREATED_FROM, PAY_TYPE } from "../common";

const invoiceItemSchema = Joi.object().keys({
  refId: objectId().optional().allow("", null),
  productId: objectId().required(),
  qty: Joi.number().min(0).required(),
  freeQty: Joi.number().min(0).default(0).optional(),
  uomId: objectId().optional().allow(null),
  price: Joi.number().min(0).required(),
  discount1: Joi.number().min(0).default(0).optional(),
  discount2: Joi.number().min(0).default(0).optional(),
  taxId: objectId().optional().allow("", null),
  taxableAmount: Joi.number().min(0).optional(),
  totalAmount: Joi.number().min(0).optional(),
});

export const addInvoiceSchema = Joi.object().keys({
  invoiceNo: Joi.string().optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  dueDate: Joi.date().required(),
  customerId: objectId().required(),
  customerName: Joi.string().optional(),
  salesOrderIds: Joi.array().items(objectId()).optional(),
  deliveryChallanIds: Joi.array().items(objectId()).optional(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional().allow("", null),
  accountLedgerId: objectId().optional().allow("", null),
  createdFrom: Joi.string().valid(...Object.values(INVOICE_CREATED_FROM)).optional().allow("", null),
  taxType: Joi.string().valid(...Object.values(TAX_TYPE)).optional().allow("", null),
  shippingDetails: Joi.object().optional(),
  items: Joi.array().items(invoiceItemSchema).min(1).required(),
  transectionSummary: transectionSummarySchema.optional(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  paidAmount: Joi.number().min(0).default(0).optional(),
  balanceAmount: Joi.number().min(0).default(0).optional(),
  payType: Joi.string().valid(...Object.values(PAY_TYPE)).optional().allow("", null),
  paymentStatus: Joi.string().valid("paid", "unpaid", "partial").default("unpaid").optional(),
  salesManId: objectId().optional().allow("", null),
  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid(...Object.values(INVOICE_STATUS)).default(INVOICE_STATUS.INVOICED).optional(),
});

export const editInvoiceSchema = Joi.object().keys({
  invoiceId: objectId().required(),
  invoiceNo: Joi.string().optional(),
  date: Joi.date().optional(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().optional(),
  customerName: Joi.string().optional(),
  salesOrderIds: Joi.array().items(objectId()).optional(),
  deliveryChallanIds: Joi.array().items(objectId()).optional(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional().allow("", null),
  accountLedgerId: objectId().optional().allow("", null),
  createdFrom: Joi.string().valid(...Object.values(INVOICE_CREATED_FROM)).optional().allow("", null),
  taxType: Joi.string().valid(...Object.values(TAX_TYPE)).optional().allow("", null),
  shippingDetails: Joi.object().optional(),
  items: Joi.array().items(invoiceItemSchema).optional(),
  transectionSummary: transectionSummarySchema.optional(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  paidAmount: Joi.number().min(0).optional(),
  balanceAmount: Joi.number().min(0).optional(),
  payType: Joi.string().valid(...Object.values(PAY_TYPE)).optional().allow("", null),
  paymentStatus: Joi.string().valid("paid", "unpaid", "partial").optional(),
  salesManId: objectId().optional().allow("", null),
  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid(...Object.values(INVOICE_STATUS)).optional(),
});

export const deleteInvoiceSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getInvoiceSchema = Joi.object().keys({
  id: objectId().required(),
});

