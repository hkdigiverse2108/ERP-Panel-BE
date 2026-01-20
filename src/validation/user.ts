import Joi, { object } from "joi";
import { baseApiSchema, commonContactSchema, objectId } from "./common";
import { permissionsSchema } from "./permission";
import { USER_TYPES } from "../common";

const addAddressSchema = Joi.object({
  address: Joi.string().required(),
  country: objectId().required(),
  state: objectId().required(),
  city: objectId().required(),
  pinCode: Joi.number().required(),
});

const editAddressSchemaOptional = Joi.object({
  address: Joi.string().optional(),
  country: objectId().optional(),
  state: objectId().optional(),
  city: objectId().optional(),
  pinCode: Joi.number().optional(),
});

const bankDetailsSchema = Joi.object({
  bankHolderName: Joi.string().allow("", null).optional(),
  name: Joi.string().allow("", null).optional(),
  branchName: Joi.string().allow("", null).optional(),
  accountNumber: Joi.number().optional().allow("", null),
  IFSCCode: Joi.string().allow("", null).optional(),
  swiftCode: Joi.string().allow("", null).optional(),
});

export const addUserSchema = Joi.object().keys({
  fullName: Joi.string().trim().required(),
  username: Joi.string().trim().required(),
  email: Joi.string().email().lowercase().optional(),
  phoneNo: commonContactSchema.required(),
  password: Joi.string().required(),
  role: objectId().required(),
  userType: Joi.string()
    .valid(...Object.values(USER_TYPES))
    .required(),
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
  email: Joi.string().email().lowercase().optional(),
  phoneNo: commonContactSchema.optional(),
  password: Joi.string().optional(),
  designation: Joi.string().optional().allow("", null),
  role: objectId().optional(),
  userType: Joi.string()
    .valid(...Object.values(USER_TYPES))
    .optional(),
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
