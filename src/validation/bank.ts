import Joi from "joi";
import { baseApiSchema, baseCompanyApiSchema, objectId } from "./common";

const addAddressSchema = Joi.object({
  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional(),
  country: objectId().required(),
  state: objectId().required(),
  city: objectId().required(),
  pinCode: Joi.number().optional(),
});

const editAddressSchemaOptional = Joi.object({
  addressLine1: Joi.string().optional().allow("", null),
  addressLine2: Joi.string().optional().allow("", null),
  country: objectId().optional().allow("", null),
  state: objectId().optional().allow("", null),
  city: objectId().optional().allow("", null),
  pinCode: Joi.number().optional().allow("", null),
});

export const addBankSchema = Joi.object().keys({
  ...baseCompanyApiSchema,
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

  address: addAddressSchema.optional(),

  branchIds: Joi.array().items(objectId()).optional(),
});

export const editBankSchema = Joi.object().keys({
  bankId: objectId().required(),
  ...baseCompanyApiSchema,
  name: Joi.string().optional(),
  ifscCode: Joi.string().optional(),
  branchName: Joi.string().optional(),
  accountHolderName: Joi.string().optional(),
  bankAccountNumber: Joi.string().optional(),
  swiftCode: Joi.string().optional().allow("", null),
  openingBalance: {
    creditBalance: Joi.number().optional().allow("", null),
    debitBalance: Joi.number().optional().allow("", null),
  },
  upiId: Joi.string().optional().allow("", null),

  address: editAddressSchemaOptional.optional(),

  branchIds: Joi.array().items(objectId()).optional().allow("", null),
});

export const deleteBankSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getBankSchema = Joi.object().keys({
  id: objectId().required(),
});
