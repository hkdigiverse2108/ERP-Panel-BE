import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addBankSchema = Joi.object().keys({
  ...baseApiSchema,
  name: Joi.string().required(),
  ifscCode: Joi.string().required(),
  branchName: Joi.string().required(),
  accountHolderName: Joi.string().required(),
  bankAccountNumber: Joi.string().required(),
  swiftCode: Joi.string().optional(),
  openingBalance: {
    creditBalance: Joi.number().optional(),
    debitBalance: Joi.number().optional(),
  },
  upiId: Joi.string().optional(),

  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional(),
  country: objectId().required(),
  state: objectId().required(),
  city: objectId().required(),
  pinCode: Joi.number().optional(),

  branchIds: Joi.array().items(objectId()).optional(),
});

export const editBankSchema = Joi.object().keys({
  bankId: objectId().required(),
  ...baseApiSchema,
  name: Joi.string().optional(),
  ifscCode: Joi.string().optional(),
  branchName: Joi.string().optional(),
  accountHolderName: Joi.string().optional(),
  bankAccountNumber: Joi.string().optional(),
  swiftCode: Joi.string().optional(),
  openingBalance: {
    creditBalance: Joi.number().optional(),
    debitBalance: Joi.number().optional(),
  },
  upiId: Joi.string().optional(),

  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional(),
  country: objectId().optional(),
  state: objectId().optional(),
  city: objectId().optional(),
  pinCode: Joi.number().optional(),

  branchIds: Joi.array().items(objectId()).optional(),
});

export const deleteBankSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getBankSchema = Joi.object().keys({
  id: objectId().required(),
});
