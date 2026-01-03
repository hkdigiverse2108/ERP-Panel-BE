import Joi from "joi";
import { objectId } from "./common";
import { VOUCHAR_TYPE } from "../common";

const voucherEntrySchema = Joi.object().keys({
  accountId: objectId().required(),
  debit: Joi.number().min(0).default(0).optional(),
  credit: Joi.number().min(0).default(0).optional(),
});

export const addVoucherSchema = Joi.object().keys({
  voucherNo: Joi.string().optional(), // Auto-generated if not provided
  date: Joi.date().required(),
  type: Joi.string()
    .valid(...Object.values(VOUCHAR_TYPE))
    .required(),
  partyId: objectId().optional().allow("", null), // For Payment/Receipt
  bankAccountId: objectId().optional().allow("", null), // For Payment/Receipt/Expense
  amount: Joi.number().min(0).default(0).optional(),
  entries: Joi.array().items(voucherEntrySchema).min(1).optional(), // For Journal/Contra
  notes: Joi.string().optional().allow("", null),
});

export const editVoucherSchema = Joi.object().keys({
  voucherId: objectId().required(),
  voucherNo: Joi.string().optional(),
  date: Joi.date().optional(),
  type: Joi.string()
    .valid(...Object.values(VOUCHAR_TYPE))
    .optional(),
  partyId: objectId().optional().allow("", null),
  bankAccountId: objectId().optional().allow("", null),
  amount: Joi.number().min(0).optional(),
  entries: Joi.array().items(voucherEntrySchema).optional(),
  notes: Joi.string().optional().allow("", null),
});

export const deleteVoucherSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getVoucherSchema = Joi.object().keys({
  id: objectId().required(),
});

