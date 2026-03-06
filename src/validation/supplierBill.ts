import Joi from "joi";
import { baseApiSchema, objectId, transactionSummarySchema, commonAdditionalChargeSchema } from "./common";
import { SUPPLIER_BILL_STATUS, SUPPLIER_PAYMENT_STATUS, PAYMENT_TERMS_ENUM } from "../common";

const supplierBillItemSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().min(0).required(),
  uomId: objectId().required(),
  unit: Joi.string().required(),
  freeQty: Joi.number().min(0).default(0),
  mrp: Joi.number().min(0).optional(),
  sellingPrice: Joi.number().min(0).optional(),
  unitCost: Joi.number().min(0).optional(),
  discount1: Joi.number().min(0).default(0),
  discount2: Joi.number().min(0).default(0),
  taxable: Joi.number().min(0).optional(),
  taxId: objectId().optional(),
  tax: Joi.string().optional(),
  landingCost: Joi.number().min(0).optional(),
  margin: Joi.number().min(0).optional(),
  total: Joi.number().min(0).optional(),
});

const supplierBillReturnItemSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().min(0).required(),
  uomId: objectId().optional(),
  unit: Joi.string().optional(),
  unitCost: Joi.number().min(0).optional(),
  discount1: Joi.number().min(0).default(0),
  discount2: Joi.number().min(0).default(0),
  taxId: objectId().optional(),
  tax: Joi.string().optional(),
  taxable: Joi.number().min(0).optional(),
  landingCost: Joi.number().min(0).optional(),
  total: Joi.number().min(0).optional(),
});

// Removed local commonAdditionalChargeSchema as it is now imported from common

export const addSupplierBillSchema = Joi.object({
  supplierId: objectId().required(),

  // supplierBillNo: Joi.string().optional(),
  referenceBillNo: Joi.string().optional(),
  supplierBillDate: Joi.date().required(),

  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional(),

  paymentTerm: Joi.string()
    .valid(...Object.values(PAYMENT_TERMS_ENUM))
    .optional(),

  dueDate: Joi.date().optional(),

  reverseCharge: Joi.boolean().default(false),
  shippingDate: Joi.date().optional(),

  taxType: Joi.string().optional(),
  invoiceAmount: Joi.string().optional(),

  productDetails: Joi.array().items(supplierBillItemSchema).optional(),

  returnProductDetails: Joi.object({
    item: Joi.array().items(supplierBillReturnItemSchema).optional(),
    totalQty: Joi.number().optional(),
    total: Joi.number().optional(),
    summary: transactionSummarySchema.optional(),
  }).optional(),

  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),

  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  notes: Joi.string().allow("").optional(),

  summary: transactionSummarySchema.optional(),

  paidAmount: Joi.number().min(0).default(0),
  balanceAmount: Joi.number().min(0).default(0),

  paymentStatus: Joi.string()
    .valid(...Object.values(SUPPLIER_PAYMENT_STATUS))
    .default(SUPPLIER_PAYMENT_STATUS.UNPAID),

  status: Joi.string()
    .valid(...Object.values(SUPPLIER_BILL_STATUS))
    .default(SUPPLIER_BILL_STATUS.ACTIVE),

  ...baseApiSchema,
});

export const editSupplierBillSchema = Joi.object({
  supplierBillId: objectId().required(),

  supplierId: objectId().optional(),

  // supplierBillNo: Joi.string().optional(),
  referenceBillNo: Joi.string().optional(),
  supplierBillDate: Joi.date().optional(),

  placeOfSupply: Joi.string().optional().allow("", null),
  billingAddress: objectId().optional(),

  paymentTerm: Joi.string()
    .valid(...Object.values(PAYMENT_TERMS_ENUM))
    .optional(),
  dueDate: Joi.date().optional(),

  reverseCharge: Joi.boolean().optional(),
  shippingDate: Joi.date().optional(),

  taxType: Joi.string().optional(),
  invoiceAmount: Joi.string().optional(),

  productDetails: Joi.array().items(supplierBillItemSchema).optional(),

  returnProductDetails: Joi.object({
    item: Joi.array().items(supplierBillReturnItemSchema).optional(),
    totalQty: Joi.number().optional(),
    total: Joi.number().optional(),
    summary: transactionSummarySchema.optional(),
  }).optional(),

  additionalCharges: Joi.array().items(commonAdditionalChargeSchema).optional(),

  termsAndConditionIds: Joi.array().items(objectId()).optional(),
  notes: Joi.string().allow("").optional(),

  summary: transactionSummarySchema.optional(),

  paidAmount: Joi.number().min(0).optional(),
  balanceAmount: Joi.number().min(0).optional(),

  paymentStatus: Joi.string()
    .valid(...Object.values(SUPPLIER_PAYMENT_STATUS))
    .optional(),

  status: Joi.string()
    .valid(...Object.values(SUPPLIER_BILL_STATUS))
    .optional(),

  ...baseApiSchema,
});

export const getSupplierBillSchema = Joi.object().keys({
  id: objectId().required(),
});

export const deleteSupplierBillSchema = Joi.object().keys({
  id: objectId().required(),
});
