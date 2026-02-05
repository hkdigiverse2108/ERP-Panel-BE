import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { PAYMENT_MODE, POS_PAYMENT_TYPE, POS_VOUCHER_TYPE } from "../../common";

const posPaymentSchema = new mongoose.Schema(
  {
    paymentNo: { type: String },
    voucherType: { type: String, enum: Object.values(POS_VOUCHER_TYPE) },
    paymentType: { type: String, enum: Object.values(POS_PAYMENT_TYPE), default: POS_PAYMENT_TYPE.AGAINST_BILL },

    partyId: { type: mongoose.Schema.Types.ObjectId, ref: "contact" },
    posOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "pos-order" },
    // salesId: { type: mongoose.Schema.Types.ObjectId, ref: "pos-order" },
    paymentMode: { type: String, enum: Object.values(PAYMENT_MODE), default: PAYMENT_MODE.CASH },

    purchaseBillId: { type: mongoose.Schema.Types.ObjectId, ref: "purchase" },
    expenseAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "account" },

    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    amount: { type: Number },

    isNonGST: { type: Boolean, default: false },
    remark: { type: String },
    ...baseSchemaFields,
  },
  baseSchemaOptions,
);

export const PosPaymentModel = mongoose.model("pos-payment", posPaymentSchema);
