import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { ADJUSTMENT_TYPE } from "../common";

export const addCreditNoteSchema = Joi.object().keys({
  date: Joi.date().required(),
  bankAccountId: objectId().required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().max(200).optional().allow("", null),
  phoneNumber: {
    countryCode: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
  },
  type: Joi.string().valid(...Object.values(ADJUSTMENT_TYPE)).required(),
  file: Joi.string().optional(),
  ...baseApiSchema,
});

export const editCreditNoteSchema = Joi.object().keys({
  creditNoteId: objectId().required(),
  date: Joi.date().optional(),
  bankAccountId: objectId().optional(),
  amount: Joi.number().min(0).optional(),
  description: Joi.string().max(200).optional().allow("", null),
  phoneNumber: {
    countryCode: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
  },
  type: Joi.string().valid(...Object.values(ADJUSTMENT_TYPE)).optional(),
  file: Joi.string().optional(),
  ...baseApiSchema,
});

export const deleteCreditNoteSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getCreditNoteSchema = Joi.object().keys({
  id: objectId().required(),
});
