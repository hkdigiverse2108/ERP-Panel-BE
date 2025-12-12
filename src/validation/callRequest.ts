import Joi from "joi";
import { objectId } from "./common";

export const addCallRequestSchema = Joi.object().keys({
  businessName: Joi.string().required(),
  contactName: Joi.string().required(),
  contactNo: Joi.string().required(),
  note: Joi.string().optional(),
});

export const editCallRequestSchema = Joi.object().keys({
  callRequestId: objectId().required(),
  businessName: Joi.string().optional(),
  contactName: Joi.string().optional(),
  contactNo: Joi.string().optional(),
  note: Joi.string().optional(),
});

export const deleteCallRequestSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getCallRequestSchema = Joi.object().keys({
  id: objectId().required(),
});
