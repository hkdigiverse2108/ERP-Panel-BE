import Joi from "joi";
import { objectId } from "./common";

export const addPrefixSchema = Joi.object().keys({
  module: Joi.string().required(),
  prefix: Joi.string().required(),
  startNumber: Joi.number().min(1).default(1).optional(),
  currentNumber: Joi.number().min(1).default(1).optional(),
});

export const editPrefixSchema = Joi.object().keys({
  prefixId: objectId().required(),
  module: Joi.string().optional(),
  prefix: Joi.string().optional(),
  startNumber: Joi.number().min(1).optional(),
  currentNumber: Joi.number().min(1).optional(),
});

export const deletePrefixSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getPrefixSchema = Joi.object().keys({
  id: objectId().required(),
});

