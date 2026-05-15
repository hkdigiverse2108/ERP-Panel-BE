import Joi from "joi";
import { objectId } from "./common";

export const addReportFormatValidation = Joi.object().keys({
  type: Joi.string().required(),
  name: Joi.string().required(),
  isActive: Joi.boolean().optional(),
  isSystemDefault: Joi.boolean().optional(),
});

export const updateReportFormatValidation = Joi.object().keys({
  reportFormatId: objectId().required(),
  type: Joi.string().optional(),
  name: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});
