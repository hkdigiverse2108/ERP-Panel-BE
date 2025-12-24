import Joi from "joi";
import { objectId } from "./common";

export const addRoleSchema = Joi.object().keys({
  companyId: objectId().optional(),
  name: Joi.string().required(),
  isActive: Joi.boolean().optional().default(false),
});

export const editRoleSchema = Joi.object().keys({
  roleId: objectId().required(),
  companyId: objectId().optional(),
  name: Joi.string().optional(),
  isActive: Joi.boolean().optional().default(false),
});

export const deleteRoleSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getRoleSchema = Joi.object().keys({
  id: objectId().required(),
});
