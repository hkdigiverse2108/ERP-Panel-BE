import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { PAYMENT_MODE, POS_ORDER_STATUS, POS_ORDER_TYPE, POS_PAYMENT_METHOD, POS_PAYMENT_STATUS } from "../common";

const multiplePaymentSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  method: Joi.string()
    .valid(...Object.values(PAYMENT_MODE))
    .required(),
  paymentAccountId: objectId().optional().allow(null),
  cardHolderName: Joi.string().optional().allow("", null),
  cardTransactionNo: Joi.string().optional().allow("", null),
  upiId: Joi.string().optional().allow("", null),
  bankAccountNo: Joi.string().optional().allow("", null),
  chequeNo: Joi.string().optional().allow("", null),
});

const posAdditionalChargeSchema = Joi.object({
  chargeId: objectId().optional().allow(null),
  value: Joi.number().min(0).optional(),
  taxId: objectId().optional().allow(null),
  accountGroupId: objectId().optional().allow(null),
  totalAmount: Joi.number().min(0).optional(),
});

const posOrderItemSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().min(0.01).required(),
  mrp: Joi.number().min(0).required(),
  discountAmount: Joi.number().min(0).default(0),
  additionalDiscountAmount: Joi.number().min(0).default(0),
  unitCost: Joi.number().min(0).required(),
  netAmount: Joi.number().min(0).required(),
});

export const addPosOrderSchema = Joi.object({
  customerId: objectId().optional().allow(null),
  orderType: Joi.string()
    .valid(...Object.values(POS_ORDER_TYPE))
    .default(POS_ORDER_TYPE.WALK_IN),
  salesManId: objectId().required(),
  items: Joi.array().items(posOrderItemSchema).min(1).required(),
  additionalCharges: Joi.array().items(posAdditionalChargeSchema).default([]).optional(),
  remark: Joi.string().optional().allow("", null),
  totalQty: Joi.number().min(0).required(),
  totalMrp: Joi.number().min(0).required(),
  totalTaxAmount: Joi.number().min(0).default(0),
  totalAdditionalCharge: Joi.number().min(0).default(0),
  totalDiscount: Joi.number().min(0).default(0),
  flatDiscountAmount: Joi.number().min(0).default(0),
  roundOff: Joi.number().default(0),
  totalAmount: Joi.number().min(0).required(),
  paymentMethod: Joi.string()
    .valid(...Object.values(POS_PAYMENT_METHOD))
    .optional()
    .allow(null),
  paymentStatus: Joi.string()
    .valid(...Object.values(POS_PAYMENT_STATUS))
    .default(POS_PAYMENT_STATUS.UNPAID),
  status: Joi.string()
    .valid(...Object.values(POS_ORDER_STATUS))
    .default(POS_ORDER_STATUS.PENDING),
  holdDate: Joi.date().optional().allow(null),
  invoiceId: objectId().optional().allow(null),
  paidAmount: Joi.number().min(0).default(0).optional(),

  payLater: Joi.object({
    dueDate: Joi.date().optional().allow(null),
    paymentTerm: Joi.string().optional().allow("", null),
    sendReminder: Joi.boolean().default(false).optional(),
  })
    .optional()
    .allow(null),

  multiplePayments: Joi.array().items(multiplePaymentSchema).default([]).optional(),
  couponId: objectId().optional().allow(null),
  couponDiscount: Joi.number().min(0).optional().default(0),

  ...baseApiSchema,
});

export const editPosOrderSchema = Joi.object().keys({
  posOrderId: objectId().required(),
  customerId: objectId().optional().allow(null),
  salesManId: objectId().optional().allow(null),
  orderType: Joi.string()
    .valid(...Object.values(POS_ORDER_TYPE))
    .default(POS_ORDER_TYPE.WALK_IN)
    .optional(),
  items: Joi.array().items(posOrderItemSchema).min(1).optional(),
  additionalCharges: Joi.array().items(posAdditionalChargeSchema).default([]).optional(),
  remark: Joi.string().optional().allow("", null),
  totalQty: Joi.number().min(0).optional(),
  totalMrp: Joi.number().min(0).optional(),
  totalTaxAmount: Joi.number().min(0).default(0).optional(),
  totalAdditionalCharge: Joi.number().min(0).default(0).optional(),
  totalDiscount: Joi.number().min(0).default(0).optional(),
  flatDiscountAmount: Joi.number().min(0).default(0).optional(),
  roundOff: Joi.number().default(0).optional(),
  totalAmount: Joi.number().min(0).optional(),
  paymentMethod: Joi.string()
    .valid(...Object.values(POS_PAYMENT_METHOD))
    .optional()
    .allow(null),
  paymentStatus: Joi.string()
    .valid(...Object.values(POS_PAYMENT_STATUS))
    .default(POS_PAYMENT_STATUS.UNPAID)
    .optional(),
  status: Joi.string()
    .valid(...Object.values(POS_ORDER_STATUS))
    .default(POS_ORDER_STATUS.PENDING)
    .optional(),
  holdDate: Joi.date().optional().allow(null),
  invoiceId: objectId().optional().allow(null),
  paidAmount: Joi.number().min(0).optional(),

  payLater: Joi.object({
    dueDate: Joi.date().optional().allow(null),
    paymentTerm: Joi.string().optional().allow("", null),
    sendReminder: Joi.boolean().optional(),
  })
    .optional()
    .allow(null),

  multiplePayments: Joi.array().items(multiplePaymentSchema).default([]).optional(),
  couponId: objectId().optional().allow(null),
  couponDiscount: Joi.number().min(0).optional(),

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

export const getCustomerPosDetailsSchema = Joi.object().keys({
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

export const posOrderDropDownSchema = Joi.object().keys({
  customerFilter: objectId().optional().allow("", null),
  branchFilter: objectId().optional().allow("", null),
  companyFilter: objectId().optional().allow("", null),
  duePaymentFilter: Joi.boolean().optional(),
  search: Joi.string().optional().allow("", null),
});
