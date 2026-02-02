import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { POS_ORDER_STATUS, POS_PAYMENT_METHOD, POS_PAYMENT_STATUS } from "../common";

const posOrderItemSchema = Joi.object().keys({
  productId: objectId().required(),
  productName: Joi.string().required(),
  qty: Joi.number().min(0.01).required(),
  freeQty: Joi.number().min(0).default(0).optional(),
  uom: Joi.string().optional().allow("", null),
  price: Joi.number().min(0).required(),
  discountPercent: Joi.number().min(0).max(100).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxId: objectId().optional().allow("", null),
  taxPercent: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  taxableAmount: Joi.number().min(0).required(),
  totalAmount: Joi.number().min(0).required(),
  ...baseApiSchema,
});

export const addPosOrderSchema = Joi.object().keys({
  // orderNo: Joi.string().optional(), // Auto-generated if not provided
  date: Joi.date()
    .default(() => new Date())
    .optional(),
  tableNo: Joi.string().optional().allow("", null),
  customerId: objectId().optional().allow("", null), // Optional customer
  customerName: Joi.string().optional().allow("", null),
  items: Joi.array().items(posOrderItemSchema).min(1).required(),
  grossAmount: Joi.number().min(0).default(0).optional(),
  discountAmount: Joi.number().min(0).default(0).optional(),
  taxAmount: Joi.number().min(0).default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  netAmount: Joi.number().min(0).default(0).optional(),
  paidAmount: Joi.number().min(0).default(0).optional(),
  balanceAmount: Joi.number().min(0).default(0).optional(),
  paymentMethod: Joi.string().valid(...Object.values(POS_PAYMENT_METHOD)).default(POS_PAYMENT_METHOD.CASH).optional(),
  paymentStatus: Joi.string().valid(...Object.values(POS_PAYMENT_STATUS)).default(POS_PAYMENT_STATUS.PAID).optional(),
  status: Joi.string().valid(...Object.values(POS_ORDER_STATUS)).default(POS_ORDER_STATUS.PENDING).optional(),
  notes: Joi.string().optional().allow("", null),
  ...baseApiSchema,
});

export const editPosOrderSchema = Joi.object().keys({
  posOrderId: objectId().required(),
  // orderNo: Joi.string().optional(),
  date: Joi.date().optional(),
  tableNo: Joi.string().optional().allow("", null),
  customerId: objectId().optional().allow("", null),
  customerName: Joi.string().optional().allow("", null),
  items: Joi.array().items(posOrderItemSchema).optional(),
  grossAmount: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  taxAmount: Joi.number().min(0).optional(),
  roundOff: Joi.number().optional(),
  netAmount: Joi.number().min(0).optional(),
  paidAmount: Joi.number().min(0).optional(),
  balanceAmount: Joi.number().min(0).optional(),
  paymentMethod: Joi.string().valid(...Object.values(POS_PAYMENT_METHOD)).optional(),
  paymentStatus: Joi.string().valid(...Object.values(POS_PAYMENT_STATUS)).optional(),
  status: Joi.string().valid(...Object.values(POS_ORDER_STATUS)).optional(),
  notes: Joi.string().optional().allow("", null),
  ...baseApiSchema,
});

export const holdPosOrderSchema = Joi.object().keys({
  posOrderId: objectId().required(),
});

export const releasePosOrderSchema = Joi.object().keys({
  posOrderId: objectId().required(),
});

export const convertToInvoiceSchema = Joi.object().keys({
  posOrderId: objectId().required(),
});

export const deletePosOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getPosOrderSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getPosCashControlSchema = Joi.object().keys({
  branchId: objectId().required(),
  date: Joi.date().optional(),
});

export const updatePosCashControlSchema = Joi.object().keys({
  branchId: objectId().required(),
  date: Joi.date().optional(),
  openingCash: Joi.number().min(0).optional(),
  actualCash: Joi.number().min(0).optional(),
  notes: Joi.string().optional().allow("", null),
  isClosed: Joi.boolean().optional(),
});

export const getCustomerLoyaltyPointsSchema = Joi.object().keys({
  customerId: objectId().required(),
});

export const redeemLoyaltyPointsSchema = Joi.object().keys({
  customerId: objectId().required(),
  pointsToRedeem: Joi.number().min(1).required(),
  discountAmount: Joi.number().min(0).optional(),
});

export const getCombinedPaymentsSchema = Joi.object().keys({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
  search: Joi.string().optional().allow("", null),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  locationId: objectId().optional().allow("", null),
});

