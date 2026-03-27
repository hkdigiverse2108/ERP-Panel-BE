import Joi from "joi";
import { PREFIX_MODULES } from "../common";
import { objectId } from "./common";

export const addPrefixSchema = Joi.object().keys({
  prefixType: Joi.string().valid(...Object.values(PREFIX_MODULES)).required(),
  prefix: Joi.string().required(),
  sequenceNumber: Joi.number().min(1).default(1).optional(),
  isActive: Joi.boolean().optional(),
});

export const editPrefixSchema = Joi.object().keys({
  prefixId: objectId().required(),
  // prefixType: Joi.string().valid(...Object.values(PREFIX_MODULES)).optional(),
  prefix: Joi.string().optional(),
  sequenceNumber: Joi.number().min(1).optional(),
  isActive: Joi.boolean().optional(),
});

export const deletePrefixSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getPrefixSchema = Joi.object().keys({
  id: objectId().required(),
});

