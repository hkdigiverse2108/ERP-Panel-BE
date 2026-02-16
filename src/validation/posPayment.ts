import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { PAYMENT_MODE, POS_PAYMENT_TYPE, POS_VOUCHER_TYPE } from "../common";

export const addPosPaymentSchema = Joi.object({
  voucherType: Joi.string()
    .valid(...Object.values(POS_VOUCHER_TYPE))
    .required(),
  paymentType: Joi.string()
    .valid(...Object.values(POS_PAYMENT_TYPE))
    .default(POS_PAYMENT_TYPE.AGAINST_BILL)
    .optional(),
  posOrderId: objectId().optional(),
  partyId: objectId().required(),
  // salesId: objectId().optional(),
  paymentMode: Joi.string()
    .valid(...Object.values(PAYMENT_MODE))
    .default(PAYMENT_MODE.CASH)
    .optional(),
  purchaseBillId: objectId().optional(),
  accountId: objectId().optional(),
  bankId: objectId().optional(),
  totalAmount: Joi.number().min(0).optional(),
  paidAmount: Joi.number().min(0).optional(),
  pendingAmount: Joi.number().optional(),
  kasturbaa: Joi.number().optional(),
  amount: Joi.number().min(0).required(),
  isNonGST: Joi.boolean().default(false).optional(),
  remark: Joi.string().optional().allow("", null),
  ...baseApiSchema,
});

export const editPosPaymentSchema = Joi.object({
  posPaymentId: objectId().required(),
  voucherType: Joi.string()
    .valid(...Object.values(POS_VOUCHER_TYPE))
    .optional(),
  paymentType: Joi.string()
    .valid(...Object.values(POS_PAYMENT_TYPE))
    .optional(),
  posOrderId: objectId().optional(),
  partyId: objectId().optional(),
  paymentMode: Joi.string()
    .valid(...Object.values(PAYMENT_MODE))
    .optional(),
  purchaseBillId: objectId().optional(),
  accountId: objectId().optional(),
  bankId: objectId().optional(),
  totalAmount: Joi.number().min(0).optional(),
  paidAmount: Joi.number().min(0).optional(),
  pendingAmount: Joi.number().optional(),
  kasturbaa: Joi.number().optional(),
  amount: Joi.number().min(0).optional(),
  isNonGST: Joi.boolean().optional(),
  remark: Joi.string().optional().allow("", null),
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
  voucherType: Joi.string()
    .valid(...Object.values(POS_VOUCHER_TYPE))
    .optional(),
  paymentType: Joi.string()
    .valid(...Object.values(POS_PAYMENT_TYPE))
    .optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  ...baseApiSchema,
});
