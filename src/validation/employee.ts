import Joi from "joi";
import { objectId } from "./common";

const addressSchema = Joi.object({
  address: Joi.string().allow("").optional(),
  country: Joi.string().optional(),
  state: Joi.string().optional(),
  city: Joi.string().optional(),
  postalCode: Joi.number().optional(),
});

const addressSchemaOptional = Joi.object({
  address: Joi.string().allow("").optional(),
  country: Joi.string().optional(),
  state: Joi.string().optional(),
  city: Joi.string().optional(),
  postalCode: Joi.number().optional(),
});

const bankDetailsSchema = Joi.object({
  bankHolderName: Joi.string().allow("").optional(),
  bankName: Joi.string().allow("").optional(),
  branch: Joi.string().allow("").optional(),
  accountNumber: Joi.number().optional(),
  IFSCCode: Joi.string().allow("").optional(),
  swiftCode: Joi.string().allow("").optional(),
});

export const addEmployeeSchema = Joi.object({
  companyId: objectId().optional(),
  branch: objectId().optional(),
  username: Joi.string().trim().required(),
  name: Joi.string().trim().required(),
  mobileNo: Joi.string().trim().required(),
  email: Joi.string().email().optional(),

  role: Joi.string().required(),
  // role: objectId().optional(),

  address: addressSchema.optional(),

  bankDetails: bankDetailsSchema.optional(),

  panNumber: Joi.string().uppercase().optional(),

  wages: Joi.number().min(0).optional(),
  commission: Joi.number().min(0).optional(),
  extraWages: Joi.number().min(0).optional(),
  target: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

export const editEmployeeSchema = Joi.object({
  employeeId: objectId().required(),

  name: Joi.string().trim().optional(),
  companyId: objectId().optional(),
  branch: objectId().optional(),

  email: Joi.string().email().optional(),
  mobileNo: Joi.string().trim().optional(),
  // role: objectId().optional(),
  role: Joi.string().optional(),

  address: addressSchemaOptional.optional(),

  bankDetails: bankDetailsSchema.optional(),

  panNumber: Joi.string().uppercase().optional(),

  wages: Joi.number().min(0).optional(),
  commission: Joi.number().min(0).optional(),
  extraWages: Joi.number().min(0).optional(),
  target: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

export const deleteEmployeeSchema = Joi.object({
  id: objectId().required(),
});

export const getEmployeeSchema = Joi.object({
  id: objectId().required(),
});
