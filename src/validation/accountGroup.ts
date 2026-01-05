import Joi from "joi";
import { objectId } from "./common";
import { ACCOUNT_NATURE, ACCOUNT_TYPE } from "../common";

export const addAccountGroupSchema = Joi.object().keys({
  name: Joi.string().required(),
  parentGroupId: objectId().required(),
  nature: Joi.string()
    .valid(...Object.values(ACCOUNT_NATURE))
    .default(ACCOUNT_NATURE.ASSETS)
    .optional(),
});

export const editAccountGroupSchema = Joi.object().keys({
  accountGroupId: objectId().required(),
  name: Joi.string().optional(),
  parentGroupId: objectId().optional(),
  nature: Joi.string()
    .valid(...Object.values(ACCOUNT_NATURE))
    .default(ACCOUNT_NATURE.ASSETS)
    .optional(),
});

export const deleteAccountGroupSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getAccountGroupSchema = Joi.object().keys({
  id: objectId().required(),
});
