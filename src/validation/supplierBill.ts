import Joi from "joi";
import { baseApiSchema, objectId, transactionSummarySchema, commonAdditionalChargeSchema } from "./common";
import { SUPPLIER_BILL_STATUS, SUPPLIER_PAYMENT_STATUS } from "../common";

const supplierBillItemSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().min(0).required(),
  freeQty: Joi.number().min(0).default(0),
  mrp: Joi.number().min(0).optional(),
  sellingPrice: Joi.number().min(0).optional(),
  unitCost: Joi.number().min(0).optional(),
  discount1: Joi.number().min(0).default(0),
  discount2: Joi.number().min(0).default(0),
  taxAmount: Joi.number().min(0).optional(),
  landingCost: Joi.number().min(0).optional(),
  margin: Joi.number().min(0).optional(),
  total: Joi.number().min(0).optional(),
});

const supplierBillReturnItemSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().min(0).required(),
  unitCost: Joi.number().min(0).optional(),
  discount1: Joi.number().min(0).default(0),
  discount2: Joi.number().min(0).default(0),
  tax: Joi.number().min(0).optional(),
  landingCost: Joi.number().min(0).optional(),
  total: Joi.number().min(0).optional(),
});

// Removed local commonAdditionalChargeSchema as it is now imported from common

export const addSupplierBillSchema = Joi.object({
  supplierId: objectId().required(),

  supplierBillNo: Joi.string().optional(),
  referenceBillNo: Joi.string().optional(),
  supplierBillDate: Joi.date().required(),

  // purchaseOrderId: objectId().optional(),

  paymentTerm: Joi.string().optional(),
  dueDate: Joi.date().optional(),

  reverseCharge: Joi.boolean().default(false),
  shippingDate: Joi.date().optional(),

  taxType: Joi.string().optional(),
  invoiceAmount: Joi.string().optional(),

  productDetails: Joi.object({
    item: Joi.array().items(supplierBillItemSchema).optional(),
    totalQty: Joi.number().optional(),
    totalTax: Joi.number().optional(),
    total: Joi.number().optional(),
  }).optional(),

  returnProductDetails: Joi.object({
    item: Joi.array().items(supplierBillReturnItemSchema).optional(),
    totalQty: Joi.number().optional(),
    total: Joi.number().optional(),
    summary: transactionSummarySchema.optional(),
  }).optional(),

  additionalCharges: Joi.object({
    item: Joi.array().items(commonAdditionalChargeSchema).optional(),
    total: Joi.number().optional(),
  }).optional(),

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

  supplierBillNo: Joi.string().optional(),
  referenceBillNo: Joi.string().optional(),
  supplierBillDate: Joi.date().optional(),

  paymentTerm: Joi.string().optional(),
  dueDate: Joi.date().optional(),

  reverseCharge: Joi.boolean().optional(),
  shippingDate: Joi.date().optional(),

  taxType: Joi.string().optional(),
  invoiceAmount: Joi.string().optional(),

  productDetails: Joi.object({
    item: Joi.array().items(supplierBillItemSchema).optional(),
    totalQty: Joi.number().optional(),
    totalTax: Joi.number().optional(),
    total: Joi.number().optional(),
  }).optional(),

  returnProductDetails: Joi.object({
    item: Joi.array().items(supplierBillReturnItemSchema).optional(),
    totalQty: Joi.number().optional(),
    total: Joi.number().optional(),
    summary: transactionSummarySchema.optional(),
  }).optional(),

  additionalCharges: Joi.object({
    item: Joi.array().items(commonAdditionalChargeSchema).optional(),
    total: Joi.number().optional(),
  }).optional(),

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
