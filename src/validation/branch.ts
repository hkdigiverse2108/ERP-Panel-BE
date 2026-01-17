import Joi from "joi";
import { commonContactSchema, objectId } from "./common";

export const addBranchSchema = Joi.object().keys({
  // Basic Info
  companyId: objectId().optional(),
  name: Joi.string().required(),
  displayName: Joi.string().required(),
  contactName: Joi.string().optional(),

  // Contact Details
  phoneNo: commonContactSchema.required(),

  telephoneNumber: Joi.string().optional(),
  email: Joi.string().email().optional(),
  userName: Joi.string().required(),
  password: Joi.string().required(),
  yearInterval: Joi.string().required(),

  // GST / Legal
  gstRegistrationType: Joi.string().required(),
  gstIdentificationNumber: Joi.string().optional(),
  panNo: Joi.string().optional(),

  // Communication Details
  webSite: Joi.string().uri().optional(),
  fssaiNo: Joi.string().length(14).optional(),

  // Address
  address: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().required(),
  pinCode: Joi.string().optional(),
  // timeZone: Joi.string().optional(),

  // Bank Details
  bankId: objectId().optional(),
  upiId: Joi.string().optional(),

  // Other
  outletSize: Joi.string().optional(),
  userIds: Joi.array().items(objectId()).optional(),

  // Status
  isActive: Joi.boolean().optional(),
});

export const editBranchSchema = Joi.object().keys({
  branchId: objectId().required(),

  // Basic Info
  companyId: objectId().optional(),
  name: Joi.string().optional(),
  displayName: Joi.string().optional(),
  contactName: Joi.string().optional().allow("", null),

  // Contact Details
  phoneNo: commonContactSchema.optional(),

  telephoneNumber: Joi.string().optional().allow("", null),
  email: Joi.string().email().optional(),
  userName: Joi.string().optional(),
  password: Joi.string().optional(),
  yearInterval: Joi.string().optional(),

  // GST / Legal
  gstRegistrationType: Joi.string().optional(),
  gstIdentificationNumber: Joi.string().optional(),
  panNo: Joi.string().optional(),

  // Communication Details
  webSite: Joi.string().uri().optional().allow("", null),
  fssaiNo: Joi.string().length(14).optional().allow("", null),

  // Address
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional(),
  pinCode: Joi.string().optional().allow("", null),
  // timeZone: Joi.string().optional(),

  // Bank Details
  bankId: objectId().optional().allow("", null),
  upiId: Joi.string().optional().allow("", null),

  // Other
  outletSize: Joi.string().optional().allow("", null),
  userIds: Joi.array().items(objectId()).optional(),

  // Status
  isActive: Joi.boolean().optional(),
});

export const deleteBranchSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getBranchSchema = Joi.object().keys({
  id: objectId().required(),
});
