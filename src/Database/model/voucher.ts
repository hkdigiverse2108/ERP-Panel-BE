import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { VOUCHAR_TYPE } from "../../common";
import { IVoucher } from "../../types";

const voucherSchema = new Schema<IVoucher>(
  {
    ...baseSchemaFields,
    voucherNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: VOUCHAR_TYPE,
      required: true,
    },

    partyId: { type: Schema.Types.ObjectId, ref: "contact" },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "account" },

    amount: { type: Number, default: 0 },

    entries: [
      {
        accountId: {
          type: Schema.Types.ObjectId,
          ref: "account",
          required: true,
        },
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 },
      },
    ],

    notes: { type: String },
  },
  baseSchemaOptions
);

export const voucherModel = mongoose.model<IVoucher>("voucher", voucherSchema);
