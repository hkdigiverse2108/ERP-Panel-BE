import Joi from "joi";
import {
  baseApiSchema,
  objectId,
  transectionSummarySchema,
  commonAdditionalChargeSchema,
} from "./common";
import { PAYMENT_TERMS_ENUM, PURCHASE_DEBIT_NOTE_STATUS } from "../common";

const purchaseDebitNoteItemSchema = Joi.object({
  productId: objectId().required(),
  uomId: objectId().optional(),
  unitCost: Joi.number().min(0).optional(),
  mrp: Joi.number().min(0).optional(),
  sellingPrice: Joi.number().min(0).optional(),
  discount1: Joi.number().min(0).default(0),
  discount2: Joi.number().min(0).default(0),
  taxId: objectId().optional(),
  landingCost: Joi.number().min(0).optional(),
  margin: Joi.number().min(0).optional(),
  total: Joi.number().min(0).optional(),
});

export const addPurchaseDebitNoteSchema = Joi.object({
  supplierId: objectId().required(),
  placeOfSupply: Joi.string().allow("").optional(),
  billingAddress: objectId().optional(),
  shippingAddress: objectId().optional(),
  referenceBillNo: Joi.string().optional(),
  debitNoteDate: Joi.date().required(),
  dueDate: Joi.date().optional(),
  shippingDate: Joi.date().optional(),
  paymentTerm: Joi.string()
    .valid(...Object.values(PAYMENT_TERMS_ENUM))
    .optional(),
  purchaseId: objectId().optional(),
  reverseCharge: Joi.boolean().default(false),
  reason: Joi.string().allow("").optional(),
  accountLedgerId: objectId().optional(),

  productDetails: Joi.object({
    items: Joi.array().items(purchaseDebitNoteItemSchema).optional(),
    totalQty: Joi.number().optional(),
    totalTax: Joi.number().optional(),
    totalAmount: Joi.number().optional(),
  }).optional(),

  additionalCharges: Joi.object({
    items: Joi.array().items(commonAdditionalChargeSchema).optional(),
    total: Joi.number().optional(),
  }).optional(),

  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  summary: transectionSummarySchema.optional(),

  status: Joi.string()
    .valid(...Object.values(PURCHASE_DEBIT_NOTE_STATUS))
    .default(PURCHASE_DEBIT_NOTE_STATUS.OPEN),

  ...baseApiSchema,
});

export const editPurchaseDebitNoteSchema = Joi.object({
  purchaseDebitNoteId: objectId().required(),
  supplierId: objectId().optional(),
  placeOfSupply: Joi.string().allow("").optional(),
  billingAddress: objectId().optional(),
  shippingAddress: objectId().optional(),
  referenceBillNo: Joi.string().optional(),
  debitNoteDate: Joi.date().optional(),
  dueDate: Joi.date().optional(),
  shippingDate: Joi.date().optional(),
  paymentTerm: Joi.string()
    .valid(...Object.values(PAYMENT_TERMS_ENUM))
    .optional(),
  purchaseId: objectId().optional(),
  reverseCharge: Joi.boolean().optional(),
  reason: Joi.string().allow("").optional(),
  accountLedgerId: objectId().optional(),

  productDetails: Joi.object({
    items: Joi.array().items(purchaseDebitNoteItemSchema).optional(),
    totalQty: Joi.number().optional(),
    totalTax: Joi.number().optional(),
    totalAmount: Joi.number().optional(),
  }).optional(),

  additionalCharges: Joi.object({
    items: Joi.array().items(commonAdditionalChargeSchema).optional(),
    total: Joi.number().optional(),
  }).optional(),

  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  summary: transectionSummarySchema.optional(),

  status: Joi.string()
    .valid(...Object.values(PURCHASE_DEBIT_NOTE_STATUS))
    .optional(),

  ...baseApiSchema,
});

export const getPurchaseDebitNoteSchema = Joi.object().keys({
  id: objectId().required(),
});

export const deletePurchaseDebitNoteSchema = Joi.object().keys({
  id: objectId().required(),
});
