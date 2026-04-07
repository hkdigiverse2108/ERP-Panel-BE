import Joi from "joi";
import { baseCompanyApiSchema, objectId } from "./common";

export const addRoleSchema = Joi.object().keys({
  name: Joi.string().required(),
  ...baseCompanyApiSchema,
});

export const editRoleSchema = Joi.object().keys({
  roleId: objectId().required(),
  name: Joi.string().optional(),
  ...baseCompanyApiSchema,
});

export const deleteRoleSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getRoleSchema = Joi.object().keys({
  id: objectId().required(),
});
  