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
  isUpiAvailable: Joi.boolean().optional(),

  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional(),
  country: Joi.string().required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
  zipCode: Joi.number().optional(),

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
  isUpiAvailable: Joi.boolean().optional(),

  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional(),
  country: Joi.string().optional(),
  state: Joi.string().optional(),
  city: Joi.string().optional(),
  zipCode: Joi.number().optional(),

  branchIds: Joi.array().items(objectId()).optional(),
});

export const deleteBankSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getBankSchema = Joi.object().keys({
  id: objectId().required(),
});
