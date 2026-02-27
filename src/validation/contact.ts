import Joi from "joi";
import { baseApiSchema, commonContactSchema, objectId } from "./common";
import { CONTACT_STATUS, CONTACT_TYPE, CUSTOMER_TYPE, SUPPLIER_TYPE, PAYMENT_TERMS_ENUM } from "../common";

const addressSchema = Joi.object({
  gstType: Joi.string().optional().allow("", null),
  gstIn: Joi.string().optional().allow("", null),

  contactFirstName: Joi.string().optional().allow("", null),
  contactLastName: Joi.string().optional().allow("", null),
  contactCompanyName: Joi.string().optional().allow("", null),

  contactNo: commonContactSchema.optional().allow("", null),

  contactEmail: Joi.string().email().optional().allow("", null),

  addressLine1: Joi.string().optional().allow("", null),
  addressLine2: Joi.string().optional().allow("", null),

  state: Joi.string().optional().allow("", null),
  city: Joi.string().optional().allow("", null),

  country: Joi.string().optional().allow("", null),
  pinCode: Joi.number().optional().allow("", null),
});

export const addContactSchema = Joi.object({
  contactType: Joi.string()
    .valid(...Object.values(CONTACT_TYPE))
    .required(),

  firstName: Joi.string().required(),
  lastName: Joi.string().optional(),
  companyName: Joi.string().optional(),
  // contactPerson: Joi.string().optional(),

  phoneNo: commonContactSchema.required(),
  whatsappNo: commonContactSchema.optional(),

  email: Joi.string().email().optional(),
  telephoneNo: Joi.string().optional(),

  panNo: Joi.string().optional(),

  dob: Joi.date().optional(),
  anniversaryDate: Joi.date().optional(),

  paymentMode: Joi.string().optional(),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional(),

  openingBalance: Joi.object({
    debitBalance: Joi.string().optional(),
    creditBalance: Joi.string().optional(),
  }).optional(),
  tanNo: Joi.string().optional(),

  customerCategory: Joi.string().optional(),
  customerType: Joi.string()
    .valid(...Object.values(CUSTOMER_TYPE))
    .when("contactType", {
      is: CONTACT_TYPE.CUSTOMER,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  supplierType: Joi.string()
    .valid(...Object.values(SUPPLIER_TYPE))
    .when("contactType", {
      is: CONTACT_TYPE.SUPPLIER,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  transporterId: Joi.string().when("contactType", {
    is: CONTACT_TYPE.TRANSPORTER,
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  productDetails: Joi.array().items(Joi.string()).optional(),

  bankDetails: Joi.object({
    ifscCode: Joi.string().optional(),
    name: Joi.string().optional(),
    branch: Joi.string().optional(),
    accountNumber: Joi.string().optional(),
  }).optional(),

  address: Joi.array().items(addressSchema).optional(),

  remarks: Joi.string().optional(),
  loyaltyPoints: Joi.number().optional(),
  membershipId: objectId().optional(),

  status: Joi.string()
    .valid(...Object.values(CONTACT_STATUS))
    .default(CONTACT_STATUS.ACTIVE),

  ...baseApiSchema,
});

export const editContactSchema = Joi.object({
  contactId: objectId().required(),

  contactType: Joi.string()
    .valid(...Object.values(CONTACT_TYPE))
    .optional(),

  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  companyName: Joi.string().optional(),
  // contactPerson: Joi.string().optional(),

  phoneNo: commonContactSchema.optional(),
  whatsappNo: commonContactSchema.optional(),

  email: Joi.string().email().optional(),
  telephoneNo: Joi.string().optional(),

  dob: Joi.date().optional(),
  anniversaryDate: Joi.date().optional(),

  paymentMode: Joi.string().optional(),
  paymentTerms: Joi.string().valid(...Object.values(PAYMENT_TERMS_ENUM)).optional(),

  openingBalance: Joi.object({
    debitBalance: Joi.string().optional(),
    creditBalance: Joi.string().optional(),
  }).optional(),

  panNo: Joi.string().optional(),
  tanNo: Joi.string().optional().allow("", null),

  customerCategory: Joi.string().optional(),
  customerType: Joi.string()
    .valid(...Object.values(CUSTOMER_TYPE))
    .optional(),

  supplierType: Joi.string()
    .valid(...Object.values(SUPPLIER_TYPE))
    .optional(),

  transporterId: Joi.string().optional(),

  productDetails: Joi.array().items(Joi.string()).optional(),

  bankDetails: Joi.object({
    ifscCode: Joi.string().optional(),
    name: Joi.string().optional(),
    branch: Joi.string().optional(),
    accountNumber: Joi.string().optional(),
  }).optional(),

  address: Joi.array().items(addressSchema).optional(),

  remarks: Joi.string().optional(),
  loyaltyPoints: Joi.number().optional(),
  membershipId: objectId().optional(),

  status: Joi.string()
    .valid(...Object.values(CONTACT_STATUS))
    .default(CONTACT_STATUS.ACTIVE),

  ...baseApiSchema,
});

export const deleteContactSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getContactSchema = Joi.object().keys({
  id: objectId().required(),
});
