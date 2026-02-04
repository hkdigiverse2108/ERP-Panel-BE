import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { POS_PAYMENT_TYPE, POS_RECEIPT_TYPE } from "../../common";

const posPaymentSchema = new mongoose.Schema(
  {
    receiptNo: { type: String },
    posOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "pos-order" },
    amount: { type: Number },
    type: { type: String, enum: Object.values(POS_PAYMENT_TYPE), default: POS_PAYMENT_TYPE.RECEIPT },
    receiptType: { type: String, enum: Object.values(POS_RECEIPT_TYPE), default: POS_RECEIPT_TYPE.AGAINST_BILL },
    ...baseSchemaFields,
  },
  baseSchemaOptions,
);

export const PosPaymentModel = mongoose.model("pos-payment", posPaymentSchema);
