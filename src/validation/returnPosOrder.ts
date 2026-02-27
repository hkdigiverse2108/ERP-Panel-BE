import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { RETURN_POS_ORDER_TYPE } from "../common";

const returnPosOrderItemSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().min(0.01).required(),
  price: Joi.number().min(0).required(),
  total: Joi.number().min(0).required(),
});

export const addReturnPosOrderSchema = Joi.object({
  posOrderId: objectId().required(),
  customerId: objectId().optional().allow(null),
  salesManId: objectId().required(),
  items: Joi.array().items(returnPosOrderItemSchema).min(1).required(),
  total: Joi.number().min(0).required(),
  type: Joi.string()
    .valid(...Object.values(RETURN_POS_ORDER_TYPE))
    .default(RETURN_POS_ORDER_TYPE.SALES_RETURN),
  reason: Joi.string().optional().allow("", null),
  refundViaCash: Joi.number().min(0).optional(),
  refundViaBank: Joi.number().min(0).optional(),
  bankAccountId: objectId().optional().allow(null),
  refundDescription: Joi.string().optional().allow("", null),
  ...baseApiSchema,
});

export const editReturnPosOrderSchema = Joi.object({
  returnPosOrderId: objectId().required(),
  posOrderId: objectId().optional().allow(null),
  customerId: objectId().optional().allow(null),
  salesManId: objectId().optional().allow(null),
  items: Joi.array().items(returnPosOrderItemSchema).min(1).optional(),
  total: Joi.number().min(0).optional(),
  type: Joi.string()
    .valid(...Object.values(RETURN_POS_ORDER_TYPE))
    .optional(),
  reason: Joi.string().optional().allow("", null),
  refundViaCash: Joi.number().min(0).optional(),
  refundViaBank: Joi.number().min(0).optional(),
  bankAccountId: objectId().optional().allow(null),
  refundDescription: Joi.string().optional().allow("", null),
  ...baseApiSchema,
});

export const deleteReturnPosOrderSchema = Joi.object({
  id: objectId().required(),
});

export const getReturnPosOrderSchema = Joi.object({
  id: objectId().required(),
});

export const returnPosOrderDropDownSchema = Joi.object({
  search: Joi.string().optional().allow("", null),
  customerId: objectId().optional().allow(null),
  type: Joi.string()
    .valid(...Object.values(RETURN_POS_ORDER_TYPE))
    .optional(),
});
