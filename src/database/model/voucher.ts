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
      enum: Object.values(VOUCHAR_TYPE),
      required: true,
    },

    partyId: { type: Schema.Types.ObjectId, ref: "contact" },
    amount: { type: Number, default: 0 },

    entries: [
      {
        // account reference removed
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 },
      },
    ],

    notes: { type: String },
  },
  baseSchemaOptions
);

export const voucherModel = mongoose.model<IVoucher>("voucher", voucherSchema);
