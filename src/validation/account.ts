import Joi from "joi";
import { objectId } from "./common";
import { ACCOUNT_TYPE } from "../common";

export const addAccountSchema = Joi.object().keys({
  name: Joi.string().required(),
  groupId: objectId().required(),
  openingBalance: Joi.number().default(0).optional(),
  currentBalance: Joi.number().default(0).optional(),
  type: Joi.string()
    .valid(...Object.values(ACCOUNT_TYPE))
    .default(ACCOUNT_TYPE.OTHER)
    .optional(),
});

export const editAccountSchema = Joi.object().keys({
  accountId: objectId().required(),
  name: Joi.string().optional(),
  groupId: objectId().optional(),
  openingBalance: Joi.number().optional(),
  currentBalance: Joi.number().optional(),
  type: Joi.string()
    .valid(...Object.values(ACCOUNT_TYPE))
    .optional(),
});

export const deleteAccountSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getAccountSchema = Joi.object().keys({
  id: objectId().required(),
});

