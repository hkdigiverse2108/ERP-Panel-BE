import Joi from "joi";
import { objectId } from "./common";

const formatItemSchema = Joi.object({
  _id: objectId().optional(),
  name: Joi.string().required(),
  isSystemDefault: Joi.boolean().optional().default(false),
  isActive: Joi.boolean().optional().default(true),
});

export const addReportFormatValidation = Joi.object().keys({
  type: Joi.string().required(),
  formats: Joi.array().items(formatItemSchema).required(),
});

export const updateReportFormatValidation = Joi.object().keys({
  type: Joi.string().required(),
  formats: Joi.array().items(formatItemSchema).required(),
});
