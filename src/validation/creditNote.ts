import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addCreditNoteSchema = Joi.object().keys({
  date: Joi.date().required(),
  fromAccountId: objectId().required(),
  toAccountId: objectId().required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().max(200).optional().allow("", null),
  ...baseApiSchema,
});

export const editCreditNoteSchema = Joi.object().keys({
  creditNoteId: objectId().required(),
  date: Joi.date().optional(),
  fromAccountId: objectId().optional(),
  toAccountId: objectId().optional(),
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
