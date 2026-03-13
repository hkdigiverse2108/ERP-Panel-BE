import Joi from "joi";
import { baseApiSchema, commonContactSchema, objectId } from "./common";
import { ADJUSTMENT_TYPE } from "../common";

export const addDebitNoteSchema = Joi.object().keys({
  date: Joi.date().required(),
  bankAccountId: objectId().required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().max(200).optional().allow("", null),
  phoneNo: commonContactSchema,
  type: Joi.string().valid(...Object.values(ADJUSTMENT_TYPE)).required(),
  image: Joi.string().optional(),
  ...baseApiSchema,
});

export const editDebitNoteSchema = Joi.object().keys({
  debitNoteId: objectId().required(),
  date: Joi.date().optional(),
  bankAccountId: objectId().optional(),
  amount: Joi.number().min(0).optional(),
  description: Joi.string().max(200).optional().allow("", null),
  phoneNo: commonContactSchema,
  type: Joi.string().valid(...Object.values(ADJUSTMENT_TYPE)).optional(),
  image: Joi.string().optional(),
  ...baseApiSchema,
});

export const deleteDebitNoteSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getDebitNoteSchema = Joi.object().keys({
  id: objectId().required(),
});
