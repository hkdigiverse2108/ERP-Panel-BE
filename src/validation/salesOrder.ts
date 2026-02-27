import Joi from "joi";
import { objectId, transectionSummarySchema, commonAdditionalChargeSchema } from "./common";
import { PAYMENT_TERMS_ENUM, SALES_ORDER_STATUS, TAX_TYPE } from "../common";
import { commonShippingSchema } from "./estimate";

const salesOrderItemSchema = Joi.object().keys({
  refId: objectId().optional().allow("", null), // Reference to estimate
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

export const addSalesOrderSchema = Joi.object().keys({
  companyId: objectId().optional().allow("", null),
  salesOrderNo: Joi.string().optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().required(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional(),
  taxType: Joi.string().optional().valid(...Object.values(TAX_TYPE)),
  salesManId: objectId().optional().allow("", null),
  selectedEstimateId: objectId().optional().allow("", null),
  items: Joi.array().items(salesOrderItemSchema).min(1).required(),
  transectionSummary: transectionSummarySchema.required(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  status: Joi.string().valid(...Object.values(SALES_ORDER_STATUS)).default(SALES_ORDER_STATUS.PENDING).optional(),
  shippingDetails: commonShippingSchema.optional(),
});

export const editSalesOrderSchema = Joi.object().keys({
  salesOrderId: objectId().required(),
  companyId: objectId().optional().allow("", null),
  salesOrderNo: Joi.string().optional(),
  date: Joi.date().optional(),
  dueDate: Joi.date().optional().allow("", null),
  customerId: objectId().optional(),
  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional().allow("", null),
  shippingAddress: objectId().optional().allow("", null),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional(),
  taxType: Joi.string().optional().valid(...Object.values(TAX_TYPE)),
  salesManId: objectId().optional().allow("", null),
  selectedEstimateId: objectId().optional().allow("", null),
  items: Joi.array().items(salesOrderItemSchema).optional(),
  transectionSummary: transectionSummarySchema.optional(),
  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),
  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  status: Joi.string().valid(...Object.values(SALES_ORDER_STATUS)).optional(),
  shippingDetails: commonShippingSchema.optional(),
});

export const deleteSalesOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getSalesOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

