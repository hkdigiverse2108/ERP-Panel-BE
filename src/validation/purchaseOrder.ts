import Joi from "joi";
import { baseApiSchema, objectId, transectionSummarySchema } from "./common";
import { ORDER_STATUS, TAX_TYPE } from "../common";

const purchaseOrderItemSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().min(0.01).required(),
  uomId: objectId().optional(),
  unitCost: Joi.number().min(0).optional(),
  tax: Joi.string().optional().allow("", null),
  landingCost: Joi.string().optional().allow("", null),
  margin: Joi.string().optional().allow("", null),
  total: Joi.number().min(0).optional(),
});

export const addPurchaseOrderSchema = Joi.object({
  supplierId: objectId().required(),
  orderDate: Joi.date().required(),

  shippingDate: Joi.date().optional().allow("", null),
  shippingNote: Joi.string().optional().allow("", null),

  taxType: Joi.string()
    .valid(...Object.values(TAX_TYPE))
    .optional(),

  items: Joi.array().items(purchaseOrderItemSchema).min(1).required(),

  termsAndConditionIds: Joi.array().items(objectId()).optional(),

  notes: Joi.string().optional().allow("", null),

  totalQty: Joi.string().optional().allow("", null),
  totalTax: Joi.string().optional().allow("", null),
  total: Joi.string().optional().allow("", null),

  summary: transectionSummarySchema.optional(),

  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .default(ORDER_STATUS.IN_PROGRESS)
    .optional(),

  ...baseApiSchema,
});

export const editPurchaseOrderSchema = Joi.object({
  purchaseOrderId: objectId().required(),

  supplierId: objectId().optional(),
  orderDate: Joi.date().optional(),
  // orderNo: Joi.string().optional().allow("", null),

  shippingDate: Joi.date().optional().allow("", null),
  shippingNote: Joi.string().optional().allow("", null),

  taxType: Joi.string()
    .valid(...Object.values(TAX_TYPE))
    .optional(),

  items: Joi.array().items(purchaseOrderItemSchema).min(1).optional(),

  termsAndConditionIds: Joi.array().items(objectId()).optional(),

  notes: Joi.string().optional().allow("", null),

  totalQty: Joi.string().optional().allow("", null),
  totalTax: Joi.string().optional().allow("", null),
  total: Joi.string().optional().allow("", null),

  summary: transectionSummarySchema.optional(),

  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .optional(),

  ...baseApiSchema,
});

export const deletePurchaseOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getPurchaseOrderSchema = Joi.object().keys({
  id: objectId().required(),
});
