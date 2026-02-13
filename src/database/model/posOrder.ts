import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { PAY_LATER_STATUS, PAYMENT_MODE, POS_ORDER_STATUS, POS_ORDER_TYPE, POS_PAYMENT_METHOD, POS_PAYMENT_STATUS } from "../../common";

export const posMultiplePaymentSchema = new Schema(
  {
    amount: { type: Number },
    method: { type: String, enum: Object.values(PAYMENT_MODE) },
    paymentAccountId: { type: Schema.Types.ObjectId, ref: "bank", default: null },
    cardHolderName: { type: String },
    cardTransactionNo: { type: String },
    upiId: { type: String },
    bankAccountNo: { type: String },
    chequeNo: { type: String },
  },
  { _id: false },
);

export const posAdditionalChargeSchema = new Schema(
  {
    chargeId: { type: Schema.Types.ObjectId, ref: "additional-charge" },
    value: { type: Number },
    taxId: { type: Schema.Types.ObjectId, ref: "tax" },
    accountGroupId: { type: Schema.Types.ObjectId, ref: "account-group" },
    totalAmount: { type: Number },
  },
  { _id: false },
);

export const posItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    qty: { type: Number },
    mrp: { type: Number },
    discountAmount: { type: Number, default: 0 },
    additionalDiscountAmount: { type: Number, default: 0 },
    unitCost: { type: Number },
    netAmount: { type: Number },
  },
  { _id: false },
);

const posOrderSchema = new Schema(
  {
    ...baseSchemaFields,
    orderNo: { type: String, required: true, index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "contact" },
    orderType: { type: String, enum: Object.values(POS_ORDER_TYPE), default: POS_ORDER_TYPE.WALK_IN },
    salesManId: { type: Schema.Types.ObjectId, ref: "user", default: null },

    items: [posItemSchema],

    remark: { type: String },
    totalQty: { type: Number, default: 0 },
    totalMrp: { type: Number, default: 0 },
    totalTaxAmount: { type: Number, default: 0 },
    totalAdditionalCharge: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    flatDiscountAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    additionalCharges: [posAdditionalChargeSchema],

    multiplePayments: [posMultiplePaymentSchema],

    paymentMethod: { type: String, enum: Object.values(POS_PAYMENT_METHOD) },
    paymentStatus: { type: String, enum: Object.values(POS_PAYMENT_STATUS), default: POS_PAYMENT_STATUS.UNPAID },
    status: { type: String, enum: Object.values(POS_ORDER_STATUS), default: POS_ORDER_STATUS.PENDING },
    holdDate: { type: Date },
    invoiceId: { type: Schema.Types.ObjectId, ref: "invoice" },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },

    payLater: {
      dueDate: { type: Date },
      paymentTerm: { type: String },
      status: { type: String, enum: Object.values(PAY_LATER_STATUS) },
      sendReminder: { type: Boolean, default: false },
      settledDate: { type: Date },
    },
    couponId: { type: Schema.Types.ObjectId, ref: "coupon", default: null },
    couponDiscount: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

export const PosOrderModel = mongoose.model("pos-order", posOrderSchema);
