import Joi from "joi";
import { objectId } from "./common";
import { VOUCHAR_TYPE } from "../common";

const voucherEntrySchema = Joi.object().keys({
  // account reference removed
  debit: Joi.number().min(0).default(0).optional(),
  credit: Joi.number().min(0).default(0).optional(),
});

export const addVoucherSchema = Joi.object().keys({
  date: Joi.date().required(),
  type: Joi.string()
    .valid(...Object.values(VOUCHAR_TYPE))
    .required(),
  partyId: objectId().optional().allow("", null), // For Payment/Receipt
  // bankAccountId reference removed
  amount: Joi.number().min(0).default(0).optional(),
  entries: Joi.array().items(voucherEntrySchema).min(1).optional(), // For Journal/Contra
  notes: Joi.string().optional().allow("", null),
});

export const editVoucherSchema = Joi.object().keys({
  voucherId: objectId().required(),
  date: Joi.date().optional(),
  type: Joi.string()
    .valid(...Object.values(VOUCHAR_TYPE))
    .optional(),
  partyId: objectId().optional().allow("", null),
  // bankAccountId reference removed
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
