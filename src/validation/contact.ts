import Joi from "joi";
import { CONTACT_TYPE, CUSTOMER_TYPE, SUPPLIER_TYPE } from "../common";
import { objectId } from "./common";

const addressSchema = Joi.object({
  GSTType: Joi.string().optional(),
  GSTIn: Joi.string().required(),

  object: Joi.array(),

  contactFirstName: Joi.string().optional(),
  contactLastName: Joi.string().optional(),
  contactCompanyName: Joi.string().optional(),

  contactNo: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  contactEmail: Joi.string().email().optional(),

  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional(),

  state: Joi.string().required(),
  city: Joi.string().required(),

  country: Joi.object({
    id: Joi.string().optional(),
    name: Joi.string().optional(),
  }).required(),

  pinCode: Joi.string().pattern(/^[0-9]{6}$/).optional(),
});

export const addContactSchema = Joi.object({
  type: Joi.string()
    .valid(...CONTACT_TYPE)
    .required(),

  firstName: Joi.string().when("type", {
    is: "customer",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  lastName: Joi.string().optional(),

  companyName: Joi.string().when("type", {
    is: Joi.valid("supplier", "transporter"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  phoneNo: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),

  whatsappNo: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional(),

  email: Joi.string().email().optional(),

  panNo: Joi.string().required(),

  // ---------------- Customer Only ----------------
  customerType: Joi.string()
    .valid(...CUSTOMER_TYPE)
    .when("type", {
      is: "customer",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  productDetails: Joi.array()
    .items(objectId().optional())
    .when("type", {
      is: "customer",
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),

  // ---------------- Supplier Only ----------------
  supplierType: Joi.string()
    .valid(...SUPPLIER_TYPE)
    .when("type", {
      is: "supplier",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  bankDetails: Joi.object({
    IFSCCode: Joi.string().optional(),
    name: Joi.string().optional(),
    branch: Joi.string().optional(),
    accountNumber: Joi.string().optional(),
  }).when("type", {
    is: "supplier",
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),

  // ---------------- Transporter Only ----------------
  transporterId: Joi.string().when("type", {
    is: "transporter",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  // ---------------- Address ----------------
  addressDetails: Joi.array()
    .items(addressSchema)
});


export const editContactSchema = Joi.object({
  id: objectId().required(),
  type: Joi.string()
    .valid(...CONTACT_TYPE)
    .optional(),

  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  companyName: Joi.string().optional(),

  phoneNo: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional(),

  whatsappNo: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional(),

  email: Joi.string().email().optional(),
  panNo: Joi.string().optional(),

  customerType: Joi.string()
    .valid(...CUSTOMER_TYPE)
    .when("type", {
      is: "customer",
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),

  productDetails: Joi.array()
    .items(Joi.string())
    .when("type", {
      is: "customer",
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),

  supplierType: Joi.string()
    .valid(...SUPPLIER_TYPE)
    .when("type", {
      is: "supplier",
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),

  bankDetails: Joi.object({
    IFSCCode: Joi.string().optional(),
    name: Joi.string().optional(),
    branch: Joi.string().optional(),
    accountNumber: Joi.string().optional(),
  }).when("type", {
    is: "supplier",
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),

  transporterId: Joi.string().when("type", {
    is: "transporter",
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),

  addressDetails: Joi.array()
    .items(addressSchema)
    .optional(),
});


export const deleteContactSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getContactSchema = Joi.object().keys({
  id: objectId().required(),
});

