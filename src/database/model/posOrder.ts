import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { POS_ORDER_STATUS, POS_ORDER_TYPE, POS_PAYMENT_METHOD, POS_PAYMENT_STATUS } from "../../common";

export const posAdditionalChargeSchema = new Schema(
  {
    chargeId: {
      type: Schema.Types.ObjectId,
      ref: "additional-charge",
    },

    value: {
      type: Number,
      required: true,
    },

    taxId: {
      type: Schema.Types.ObjectId,
      ref: "tax",
    },

    accountGroupId: {
      type: Schema.Types.ObjectId,
      ref: "account-group",
    },

    totalAmount: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

export const posItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },

    qty: { type: Number },

    mrp: { type: Number },

    discountAmount: { type: Number, default: 0 },
    additionalDiscountAmount: { type: Number, default: 0 },

    unitCost: { type: Number },
    netAmount: { type: Number },
  },
  {
    _id: false,
  },
);

// POS Order Schema
const posOrderSchema = new Schema(
  {
    ...baseSchemaFields,
    orderNo: { type: String, required: true, index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "contact" },
    orderType: { type: String, enum: Object.values(POS_ORDER_TYPE), default: POS_ORDER_TYPE.WALK_IN },

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

    paymentMethod: { type: String, enum: Object.values(POS_PAYMENT_METHOD) },
    paymentStatus: { type: String, enum: Object.values(POS_PAYMENT_STATUS), default: POS_PAYMENT_STATUS.UNPAID },
    status: { type: String, enum: Object.values(POS_ORDER_STATUS), default: POS_ORDER_STATUS.PENDING },
    holdDate: { type: Date },
    invoiceId: { type: Schema.Types.ObjectId, ref: "invoice" },
    paidAmount: { type: Number, default: 0 },

    payLaterId: { type: Schema.Types.ObjectId, ref: "pay-later" },

    // notes: { type: String },
  },
  baseSchemaOptions,
);

export const PosOrderModel = mongoose.model("pos-order", posOrderSchema);
