import Joi from "joi";
import { objectId } from "./common";

export const addModuleSchema = Joi.object().keys({
  tabName: Joi.string().trim().required(),
  displayName: Joi.string().trim().optional().allow("", null),
  tabUrl: Joi.string().trim().optional().allow("", null),
  number: Joi.number().min(0).optional(),
  hasView: Joi.boolean().default(false).optional(),
  hasAdd: Joi.boolean().default(false).optional(),
  hasEdit: Joi.boolean().default(false).optional(),
  hasDelete: Joi.boolean().default(false).optional(),
  default: Joi.boolean().default(false).optional(),
  isActive: Joi.boolean().default(true).optional(),
  parentId: objectId().optional().allow("", null),
});

export const editModuleSchema = Joi.object().keys({
  moduleId: objectId().required(),
  tabName: Joi.string().trim().optional(),
  displayName: Joi.string().trim().optional().allow("", null),
  tabUrl: Joi.string().trim().optional().allow("", null),
  number: Joi.number().min(0).optional(),
  hasView: Joi.boolean().optional(),
  hasAdd: Joi.boolean().optional(),
  hasEdit: Joi.boolean().optional(),
  hasDelete: Joi.boolean().optional(),
  default: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  parentId: objectId().optional().allow("", null),
});

export const deleteModuleSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getModuleSchema = Joi.object().keys({
  page: Joi.number().optional(),
  limit: Joi.number().optional(),
  search: Joi.string().optional().allow("", null),
  activeFilter: Joi.boolean().optional(),
});

export const getModuleByIdSchema = Joi.object().keys({
  id: objectId().required(),
});

export const bulkEditModuleSchema = Joi.object().keys({
  users: Joi.array().items().required(),
  moduleId: objectId().required(),
});

export const getUsersPermissionsByModuleIdSchema = Joi.object().keys({
  moduleId: objectId().required(),
});
