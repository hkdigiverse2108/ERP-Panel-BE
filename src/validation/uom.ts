import Joi from "joi";
import { objectId } from "./common";

export const addUOMSchema = Joi.object({
  name: Joi.string().trim().required(),
  code: Joi.string().trim().uppercase().optional().allow("", null),
  isActive: Joi.boolean().optional(),
});

export const editUOMSchema = Joi.object({
  uomId: objectId().required(),
  name: Joi.string().trim().optional(),
  code: Joi.string().trim().uppercase().optional().allow("", null),
  isActive: Joi.boolean().optional(),
});

export const deleteUOMSchema = Joi.object({
  id: objectId().required(),
});

export const getUOMSchema = Joi.object({
  id: objectId().required(),
});
