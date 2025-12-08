import Joi from "joi";

export const addRoleSchema = Joi.object().keys({
  companyId: Joi.string().optional(),
  role: Joi.string().required(),
});

export const editRoleSchema = Joi.object().keys({
  roleId: Joi.string().required(),
  companyId: Joi.string().optional(),
  role: Joi.string().optional(),
});

export const deleteRoleSchema = Joi.object().keys({
  id: Joi.string().required(),
});
