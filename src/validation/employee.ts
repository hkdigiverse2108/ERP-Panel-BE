import Joi from "joi";
import { objectId } from "./common";

const addressSchema = Joi.object({
  address: Joi.string().allow("").optional(),
  country: Joi.string().required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
  postalCode: Joi.string().allow("").optional(),
});

const addressSchemaOptional = Joi.object({
  address: Joi.string().allow("").optional(),
  country: Joi.string().optional(),
  state: Joi.string().optional(),
  city: Joi.string().optional(),
  postalCode: Joi.string().allow("").optional(),
});

const bankDetailsSchema = Joi.object({
  bankHolderName: Joi.string().allow("").optional(),
  bankName: Joi.string().allow("").optional(),
  branch: Joi.string().allow("").optional(),
  accountNumber: Joi.string().allow("").optional(),
  IFSCCode: Joi.string().allow("").optional(),
  swiftCode: Joi.string().allow("").optional(),
});

export const addEmployeeSchema = Joi.object({
  name: Joi.string().trim().required(),
  companyId: objectId().required(),
  branch: objectId().required(),
  email: Joi.string().email().optional(),
  phoneNo: Joi.string().trim().required(),
  username: Joi.string().trim().required(),
  role: objectId().optional(),
  address: addressSchema.required(),
  bankDetails: bankDetailsSchema.optional(),
  panNumber: Joi.string().uppercase().optional(),
  wages: Joi.number().min(0).optional(),
  commission: Joi.number().min(0).optional(),
  extraWages: Joi.number().min(0).optional(),
  target: Joi.number().min(0).optional(),
});

export const editEmployeeSchema = Joi.object({
  employeeId: objectId().required(),
  name: Joi.string().trim().optional(),
  companyId: objectId().optional(),
  branch: objectId().optional(),
  email: Joi.string().email().optional(),
  phoneNo: Joi.string().trim().optional(),
  role: objectId().optional(),
  address: addressSchemaOptional.optional(),
  bankDetails: bankDetailsSchema.optional(),
  panNumber: Joi.string().uppercase().optional(),
  wages: Joi.number().min(0).optional(),
  commission: Joi.number().min(0).optional(),
  extraWages: Joi.number().min(0).optional(),
  target: Joi.number().min(0).optional(),
});

export const deleteEmployeeSchema = Joi.object({
  id: objectId().required(),
});

export const getEmployeeSchema = Joi.object({
  id: objectId().required(),
});
