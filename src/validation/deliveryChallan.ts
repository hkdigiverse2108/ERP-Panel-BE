import Joi from "joi";
import { baseApiSchema, commonAdditionalChargeSchema, objectId, transactionSummarySchema } from "./common";
import { DELIVERY_CHALLAN_STATUS, PAYMENT_TERMS_ENUM, TAX_TYPE } from "../common";

const deliveryChallanItemSchema = Joi.object().keys({
  refId: objectId().optional().allow(null),
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
  deliveryChallanNo: Joi.string().optional(),
  date: Joi.date().required(),
  dueDate: Joi.date().required(),
  customerId: objectId().required(),
  salesOrderIds: Joi.array().items(objectId()).optional(),
  invoiceIds: Joi.array().items(objectId()).optional(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional().allow("", null),
  createdFrom: Joi.string().valid(...Object.values(["invoice", "sales-order", ""])).optional().allow("", null),
  taxType: Joi.string().valid(...Object.values(TAX_TYPE)).optional().allow("", null),
  shippingDetails: Joi.object().optional(),
  transactionSummary: transactionSummarySchema.optional(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  items: Joi.array().items(deliveryChallanItemSchema).min(1).required(),
  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid(...Object.values(DELIVERY_CHALLAN_STATUS)).default(DELIVERY_CHALLAN_STATUS.DELIVERED),
  ...baseApiSchema
});

export const editDeliveryChallanSchema = Joi.object().keys({
  deliveryChallanId: objectId().required(),
  date: Joi.date().optional(),
  customerId: objectId().optional(),
  salesOrderIds: Joi.array().items(objectId()).optional(),
  invoiceIds: Joi.array().items(objectId()).optional(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional().allow("", null),
  createdFrom: Joi.string().valid(...Object.values(["invoice", "sales-order", ""])).optional().allow("", null),
  taxType: Joi.string().valid(...Object.values(TAX_TYPE)).optional().allow("", null),
  shippingDetails: Joi.object().optional(),
  transactionSummary: transactionSummarySchema.optional(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  items: Joi.array().items(deliveryChallanItemSchema).optional(),
  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  notes: Joi.string().optional().allow("", null),
  status: Joi.string().valid(...Object.values(DELIVERY_CHALLAN_STATUS)).default(DELIVERY_CHALLAN_STATUS.DELIVERED),
  ...baseApiSchema
});

export const deleteDeliveryChallanSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getDeliveryChallanSchema = Joi.object().keys({
  id: objectId().required(),
});

