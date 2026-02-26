import Joi from "joi";
import { commonAdditionalChargeSchema, objectId, transectionSummarySchema } from "./common";

const estimateItemSchema = Joi.object().keys({
  productId: objectId().required(),
  productName: Joi.string().optional().allow("", null),
  batchNo: Joi.string().optional().allow("", null),
  qty: Joi.number().min(0).required(),
  freeQty: Joi.number().min(0).default(0).optional(),
  uom: Joi.string().optional().allow("", null),
  price: Joi.number().min(0).required(),
  discountPercent: Joi.number().min(0).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxId: objectId().optional().allow("", null),
  taxPercent: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  taxableAmount: Joi.number().min(0).optional(),
  totalAmount: Joi.number().min(0).optional(),
});

export const addEstimateSchema = Joi.object().keys({
  date: Joi.date().required(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().required(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  items: Joi.array().items(estimateItemSchema).min(1).required(),
  notes: Joi.array().items(Joi.string()).optional(),
  reverseCharge: Joi.boolean().default(false).optional(),
  status: Joi.string().valid("pending", "converted", "cancelled").default("pending").optional(),
  transectionSummary: transectionSummarySchema.required(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  paymentTerms: Joi.array().items(objectId()).optional(),
  taxType: Joi.string().optional().allow("", null),
  sez: Joi.string().optional().allow("", null),
});

export const editEstimateSchema = Joi.object().keys({
  estimateId: objectId().required(),
  estimateNo: Joi.string().optional(),
  date: Joi.date().optional(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().optional(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  items: Joi.array().items(estimateItemSchema).optional(),
  notes: Joi.array().items(Joi.string()).optional(),
  reverseCharge: Joi.boolean().optional(),
  status: Joi.string().valid("pending", "converted", "cancelled").optional(),
  transectionSummary: transectionSummarySchema.optional(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  paymentTerms: Joi.array().items(objectId()).optional(),
  taxType: Joi.string().optional().allow("", null),
  sez: Joi.string().optional().allow("", null),
});

export const deleteEstimateSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getEstimateSchema = Joi.object().keys({
  id: objectId().required(),
});
