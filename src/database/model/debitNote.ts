import mongoose, { Schema } from "mongoose";
import { IDebitNote } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const debitNoteSchema = new Schema<IDebitNote>(
  {
    ...baseSchemaFields,

    voucherNumber: { type: String },
    date: { type: Date },
    fromAccount: { type: Schema.Types.ObjectId, ref: "account" },
    toAccount: { type: Schema.Types.ObjectId, ref: "account" },
    amount: { type: Number, min: 0 },
    description: { type: String, maxlength: 200 },
  },
  baseSchemaOptions,
);
export const debitNoteModel = mongoose.model<IDebitNote>("debit-note", debitNoteSchema);
