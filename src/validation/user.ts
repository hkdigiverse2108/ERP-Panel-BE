import Joi from "joi";
import { objectId } from "./common";
import { permissionsSchema } from "./permission";

export const addUserSchema = Joi.object().keys({
  companyId: objectId().optional(),
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().required(),
  profileImage: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  isActive: Joi.boolean().optional().default(true),
  permissions: permissionsSchema
});

export const editUserSchema = Joi.object().keys({
  userId: objectId().required(),
  companyId: Joi.string().optional(),
  fullName: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().optional(),
  profileImage: Joi.string().optional().allow(""),
  role: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  isActive: Joi.boolean().optional().default(false),
});

export const deleteUserSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getUserSchema = Joi.object().keys({
  id: objectId().required(),
});
