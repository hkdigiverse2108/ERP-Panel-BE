import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addCreditNoteSchema = Joi.object().keys({
  // voucherNumber: Joi.string().required(),
  date: Joi.date().required(),
  fromAccount: objectId().required(),
  toAccount: objectId().required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().max(200).optional().allow("", null),
  ...baseApiSchema,
});

export const editCreditNoteSchema = Joi.object().keys({
  creditNoteId: objectId().required(),
  // voucherNumber: Joi.string().optional(),
  date: Joi.date().optional(),
  fromAccount: objectId().optional(),
  toAccount: objectId().optional(),
  amount: Joi.number().min(0).optional(),
  description: Joi.string().max(200).optional().allow("", null),
  ...baseApiSchema,
});

export const deleteCreditNoteSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getCreditNoteSchema = Joi.object().keys({
  id: objectId().required(),
});
