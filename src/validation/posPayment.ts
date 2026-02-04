import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { POS_PAYMENT_TYPE, POS_RECEIPT_TYPE } from "../common";

export const addPosPaymentSchema = Joi.object({
  posOrderId: objectId().required(),
  amount: Joi.number().min(0).required(),
  type: Joi.string()
    .valid(...Object.values(POS_PAYMENT_TYPE))
    .default(POS_PAYMENT_TYPE.RECEIPT)
    .optional(),
  receiptType: Joi.string()
    .valid(...Object.values(POS_RECEIPT_TYPE))
    .default(POS_RECEIPT_TYPE.AGAINST_BILL)
    .optional(),
  ...baseApiSchema,
});

export const editPosPaymentSchema = Joi.object({
  posPaymentId: objectId().required(),
  posOrderId: objectId().optional(),
  amount: Joi.number().min(0).optional(),
  type: Joi.string()
    .valid(...Object.values(POS_PAYMENT_TYPE))
    .optional(),
  receiptType: Joi.string()
    .valid(...Object.values(POS_RECEIPT_TYPE))
    .optional(),
  ...baseApiSchema,
});

export const getPosPaymentSchema = Joi.object({
  id: objectId().required(),
});

export const deletePosPaymentSchema = Joi.object({
  id: objectId().required(),
});

export const getAllPosPaymentSchema = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
  search: Joi.string().optional().allow("", null),
  posOrderId: objectId().optional(),
  type: Joi.string()
    .valid(...Object.values(POS_PAYMENT_TYPE))
    .optional(),
  receiptType: Joi.string()
    .valid(...Object.values(POS_RECEIPT_TYPE))
    .optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  ...baseApiSchema,
});
