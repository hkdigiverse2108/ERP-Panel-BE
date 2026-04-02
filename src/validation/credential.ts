import Joi from "joi";
import { objectId } from "./common";

export const addCredentialSchema = Joi.object().keys({
  projectId: Joi.string().required(),
  publishableKey: Joi.string().required(),
  supabaseUrl: Joi.string().required(),
  isActive: Joi.boolean().optional(),
});

export const editCredentialSchema = Joi.object().keys({
  credentialId: objectId().required(),
  projectId: Joi.string().optional(),
  publishableKey: Joi.string().optional(),
  supabaseUrl: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});

export const deleteCredentialSchema = Joi.object().keys({
  id: objectId().required(),
});
