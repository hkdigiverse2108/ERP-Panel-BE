import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { DISCOUNT_TYPE } from "../common";

const discountSchema = Joi.object().keys({
  value: Joi.number().min(0).default(0),
  type: Joi.string()
    .valid(...Object.values(DISCOUNT_TYPE))
    .default(DISCOUNT_TYPE.PERCENTAGE),
});

const supplierBillItemSchema = Joi.object().keys({
  productId: objectId().required(),
  qty: Joi.number().min(0).required(),
  freeQty: Joi.number().min(0).default(0),
  unitCost: Joi.number().min(0).required(),
  mrp: Joi.number().min(0).optional(),
  sellingPrice: Joi.number().min(0).optional(),
  discount1: discountSchema.optional(),
  discount2: discountSchema.optional(),
});

const supplierBillReturnItemSchema = Joi.object().keys({
  productId: objectId().required(),
  batchNo: Joi.string().optional(),
  qty: Joi.number().min(0).required(),
  unit: Joi.string().optional(),
  unitCost: Joi.number().min(0).required(),
  discount1: discountSchema.optional(),
  discount2: discountSchema.optional(),
});

const additionalChargeSchema = Joi.object().keys({
  chargeId: objectId().required(),
  value: Joi.number().min(0).required(),
  taxRate: Joi.number().min(0).optional(),
});

export const addSupplierBillSchema = Joi.object().keys({
  supplierId: objectId().required(),

  supplierBillNo: Joi.string().optional(),
  referenceBillNo: Joi.string().optional(),
  supplierBillDate: Joi.date().required(),

  purchaseOrderId: objectId().optional(),

  paymentTerm: Joi.string().optional(),
  dueDate: Joi.date().optional(),

  reverseCharge: Joi.boolean().default(false),
  shippingDate: Joi.date().optional(),

  taxType: Joi.string().required(),
  invoiceAmount: Joi.string().optional(),

  productDetails: Joi.array().items(supplierBillItemSchema).optional(),
  returnProductDetails: Joi.array().items(supplierBillReturnItemSchema).optional(),
  additionalCharges: Joi.array().items(additionalChargeSchema).optional(),
  termsAndConditionId: objectId().optional(),
  notes: Joi.string().allow("").optional(),
  summary: Joi.object()
    .keys({
      flatDiscount: discountSchema.optional(),
      roundOff: Joi.number().optional(),
    })
    .optional(),
  paidAmount: Joi.number().min(0).default(0),

  ...baseApiSchema,
});

export const editSupplierBillSchema = Joi.object().keys({
  supplierBillId: objectId().required(),

  supplierId: objectId().optional(),
  supplierBillNo: Joi.string().optional(),
  referenceBillNo: Joi.string().optional(),
  supplierBillDate: Joi.date().optional(),

  purchaseOrderId: objectId().optional(),

  paymentTerm: Joi.string().optional(),
  dueDate: Joi.date().optional(),

  reverseCharge: Joi.boolean().optional(),
  shippingDate: Joi.date().optional(),

  taxType: Joi.string().optional(),
  invoiceAmount: Joi.string().optional(),

  productDetails: Joi.array().items(supplierBillItemSchema).optional(),

  returnProductDetails: Joi.array().items(supplierBillReturnItemSchema).optional(),

  additionalCharges: Joi.array().items(additionalChargeSchema).optional(),

  termsAndConditionId: objectId().optional(),
  notes: Joi.string().allow("").optional(),

  summary: Joi.object()
    .keys({
      flatDiscount: discountSchema.optional(),
      roundOff: Joi.number().optional(),
    })
    .optional(),

  paidAmount: Joi.number().min(0).optional(),

  ...baseApiSchema,
});

export const getSupplierBillSchema = Joi.object().keys({
  id: objectId().required(),
});

export const deleteSupplierBillSchema = Joi.object().keys({
  id: objectId().required(),
});
