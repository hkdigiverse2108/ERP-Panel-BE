import Joi from "joi";
import { objectId } from "./common";

const operationsSchema = Joi.object({
  add: Joi.boolean().default(false),
  update: Joi.boolean().default(false),
  deleted: Joi.boolean().default(false),
  view: Joi.boolean().default(false),
  all: Joi.boolean().default(false),
});

export const permissionsSchema = Joi.object({
  dashboard: operationsSchema.optional(),
  profile: operationsSchema.optional(),
  employee: operationsSchema.optional(),
  purchase: operationsSchema.optional(),
  sales: operationsSchema.optional(),
}).optional();

const modulePermissionSchema = Joi.object().keys({
  _id: objectId().required(),
  add: Joi.boolean().default(false).optional(),
  edit: Joi.boolean().default(false).optional(),
  view: Joi.boolean().default(false).optional(),
  delete: Joi.boolean().default(false).optional(),
  isActive: Joi.boolean().default(false).optional(),
}).unknown(true);

export const editPermissionSchema = Joi.object().keys({
  modules: Joi.array().items(modulePermissionSchema).min(1).required(),
  roleId: objectId().required(),
});

export const getPermissionSchema = Joi.object().keys({
  userId: objectId().optional(),
  search: Joi.string().optional().allow("", null),
});

export const setDefaultPermissionSchema = Joi.object().keys({
  roleId: objectId().required(),
  updateModuleDefault: Joi.boolean().default(true).optional(),
});
