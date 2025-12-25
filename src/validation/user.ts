import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { permissionsSchema } from "./permission";

const addAddressSchema = Joi.object({
  address: Joi.string().required(),
  country: Joi.string().required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
  postalCode: Joi.number().required(),
});

const editAddressSchemaOptional = Joi.object({
  address: Joi.string().optional(),
  country: Joi.string().optional(),
  state: Joi.string().optional(),
  city: Joi.string().optional(),
  postalCode: Joi.number().optional(),
});

const bankDetailsSchema = Joi.object({
  bankHolderName: Joi.string().allow("", null).optional(),
  bankName: Joi.string().allow("", null).optional(),
  branchName: Joi.string().allow("", null).optional(),
  accountNumber: Joi.number().optional().allow("", null),
  IFSCCode: Joi.string().allow("", null).optional(),
  swiftCode: Joi.string().allow("", null).optional(),
});

export const addUserSchema = Joi.object().keys({
  fullName: Joi.string().trim().required(),
  username: Joi.string().trim().required(),
  email: Joi.string().email().optional(),
  phoneNo: Joi.string().trim().required(),
  password: Joi.string().required(),
  role: objectId().required(),
  address: addAddressSchema.optional(),
  bankDetails: bankDetailsSchema.optional(),
  panNumber: Joi.string().uppercase().optional().allow("", null),
  wages: Joi.number().min(0).optional().allow(null),
  commission: Joi.number().min(0).optional().allow(null),
  extraWages: Joi.number().min(0).optional().allow(null),
  target: Joi.number().min(0).optional().allow(null),
  permissions: permissionsSchema,
  designation: Joi.string().optional().allow("", null),
  ...baseApiSchema,
});

export const editUserSchema = Joi.object().keys({
  userId: objectId().required(),
  fullName: Joi.string().trim().optional().allow("", null),
  username: Joi.string().trim().optional(),
  email: Joi.string().email().optional(),
  phoneNo: Joi.string().trim().optional(),
  password: Joi.string().optional(),
  designation: Joi.string().optional().allow("", null),
  role: objectId().optional(),
  address: editAddressSchemaOptional.optional().allow("", null),
  bankDetails: bankDetailsSchema.optional().allow("", null),
  panNumber: Joi.string().uppercase().optional().allow("", null),
  wages: Joi.number().min(0).optional().allow("", null),
  commission: Joi.number().min(0).optional().allow("", null),
  extraWages: Joi.number().min(0).optional().allow("", null),
  target: Joi.number().min(0).optional().allow("", null),
  permissions: permissionsSchema,
  ...baseApiSchema,
});

export const deleteUserSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getUserSchema = Joi.object().keys({
  id: objectId().required(),
});
