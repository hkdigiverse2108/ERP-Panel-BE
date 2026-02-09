import Joi from "joi";
import { objectId } from "./common";
import { ACCOUNT_GROUP_TYPE } from "../common";

export const addAccountGroupSchema = Joi.object().keys({
  name: Joi.string().trim().lowercase().required(),
  parentGroupId: objectId().optional(),
  nature: Joi.string()
    .valid(...Object.values(ACCOUNT_GROUP_TYPE))
    .default(ACCOUNT_GROUP_TYPE.ASSETS)
    .optional(),
  isActive: Joi.boolean().optional(),
});

export const editAccountGroupSchema = Joi.object().keys({
  accountGroupId: objectId().required(),
  name: Joi.string().trim().lowercase().optional(),
  parentGroupId: objectId().optional().allow(null),
  nature: Joi.string()
    .valid(...Object.values(ACCOUNT_GROUP_TYPE))
    .default(ACCOUNT_GROUP_TYPE.ASSETS)
    .optional(),
  isActive: Joi.boolean().optional(),
});

export const deleteAccountGroupSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getAccountGroupSchema = Joi.object().keys({
  id: objectId().required(),
});
