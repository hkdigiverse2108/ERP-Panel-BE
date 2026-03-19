import Joi from "joi";
import {
  baseApiSchema,
  objectId,
  transactionSummarySchema,
  commonAdditionalChargeSchema,
  commonShippingSchema,
} from "./common";
import {
  PURCHASE_DEBIT_NOTE_STATUS,
  SALES_CREDIT_NOTE_PRODUCT_TYPE,
} from "../common";

const salesCreditNoteItemSchema = Joi.object({
  productId: objectId().required(),
  uomId: objectId().optional(),
  unit: Joi.string().optional(),
  qty: Joi.number().min(0).required(),
  freeQty: Joi.number().min(0).default(0),
  price: Joi.number().min(0).optional(),
  discount1: Joi.number().min(0).default(0),
  discount2: Joi.number().min(0).default(0),
  taxId: objectId().optional(),
  tax: Joi.number().optional(),
  total: Joi.number().min(0).optional(),
});

export const addSalesCreditNoteSchema = Joi.object({
  customerId: objectId().required(),
  placeOfSupply: Joi.string().allow("").optional(),
  billingAddress: objectId().optional(),
  shippingAddress: objectId().optional(),
  creditNoteDate: Joi.date().required(),
  dueDate: Joi.date().optional(),
  salesId: objectId().optional(),
  reverseCharge: Joi.boolean().default(false),
  reason: Joi.string().allow("").optional(),
  sez: Joi.string().allow("").optional(),
  paymentReminder: Joi.boolean().default(false),
  productType: Joi.string()
    .valid(...Object.values(SALES_CREDIT_NOTE_PRODUCT_TYPE))
    .default(SALES_CREDIT_NOTE_PRODUCT_TYPE.ALL),
  salesManId: objectId().optional(),

  productDetails: Joi.array().items(salesCreditNoteItemSchema).optional(),

  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),

  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  notes: Joi.string().allow("").optional(),
  shippingDetails: commonShippingSchema.optional(),
  summary: transactionSummarySchema.optional(),

  status: Joi.string()
    .valid(...Object.values(PURCHASE_DEBIT_NOTE_STATUS))
    .default(PURCHASE_DEBIT_NOTE_STATUS.OPEN),

  ...baseApiSchema,
});

export const editSalesCreditNoteSchema = Joi.object({
  salesCreditNoteId: objectId().required(),
  customerId: objectId().optional(),
  placeOfSupply: Joi.string().allow("").optional(),
  billingAddress: objectId().optional(),
  shippingAddress: objectId().optional(),
  creditNoteDate: Joi.date().optional(),
  dueDate: Joi.date().optional(),
  salesId: objectId().optional(),
  reverseCharge: Joi.boolean().optional(),
  sez: Joi.string().allow("").optional(),
  paymentReminder: Joi.boolean().optional(),
  productType: Joi.string()
    .valid(...Object.values(SALES_CREDIT_NOTE_PRODUCT_TYPE))
    .optional(),
  salesManId: objectId().optional(),
  reason: Joi.string().allow("").optional(),
  productDetails: Joi.array().items(salesCreditNoteItemSchema).optional(),

  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),

  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  notes: Joi.string().allow("").optional(),
  shippingDetails: commonShippingSchema.optional(),
  summary: transactionSummarySchema.optional(),

  status: Joi.string()
    .valid(...Object.values(PURCHASE_DEBIT_NOTE_STATUS))
    .optional(),

  ...baseApiSchema,
});

export const getSalesCreditNoteSchema = Joi.object().keys({
  id: objectId().required(),
});

export const deleteSalesCreditNoteSchema = Joi.object().keys({
  id: objectId().required(),
});
