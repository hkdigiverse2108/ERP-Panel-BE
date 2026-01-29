import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

export interface ICreditNote {
  voucherNumber: string;
  date: Date;
  fromAccountId: Schema.Types.ObjectId;
  toAccountId: Schema.Types.ObjectId;
  amount: number;
  description?: string;
}

const creditNoteSchema = new Schema<ICreditNote>(
  {
    ...baseSchemaFields,

    voucherNumber: { type: String },
    date: { type: Date },
    fromAccountId: { type: Schema.Types.ObjectId, ref: "account" },
    toAccountId: { type: Schema.Types.ObjectId, ref: "account" },
    amount: { type: Number, min: 0 },
    description: { type: String, maxlength: 200 },
  },
  baseSchemaOptions,
);

export const creditNoteModel = mongoose.model<ICreditNote>("credit-note", creditNoteSchema);
