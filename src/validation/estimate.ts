import Joi from "joi";
import { commonAdditionalChargeSchema, objectId, transectionSummarySchema } from "./common";
import { ESTIMATE_STATUS, PAYMENT_TERMS_ENUM, TAX_TYPE } from "../common";

const estimateItemSchema = Joi.object().keys({
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

export const addEstimateSchema = Joi.object().keys({
  date: Joi.date().required(),
  dueDate: Joi.date().required(),
  customerId: objectId().required(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  items: Joi.array().items(estimateItemSchema).min(1).required(),
  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  reverseCharge: Joi.boolean().default(false).optional(),
  transectionSummary: transectionSummarySchema.required(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional(),
  taxType: Joi.string().optional().valid(...Object.values(TAX_TYPE)),
  sez: Joi.string().optional().allow("", null),
});

export const editEstimateSchema = Joi.object().keys({
  estimateId: objectId().required(),
  estimateNo: Joi.string().optional(),
  date: Joi.date().optional(),
  dueDate: Joi.date().optional(),
  customerId: objectId().optional(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  items: Joi.array().items(estimateItemSchema).optional(),
  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  reverseCharge: Joi.boolean().optional(),
  transectionSummary: transectionSummarySchema.optional(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional(),
  taxType: Joi.string().optional().valid(...Object.values(TAX_TYPE)),
  sez: Joi.string().optional().allow("", null),
});

export const deleteEstimateSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getEstimateSchema = Joi.object().keys({
  id: objectId().required(),
});
