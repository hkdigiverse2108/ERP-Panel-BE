import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { ADJUSTMENT_TYPE } from "../../common";

// export interface ICreditNote {
//   voucherNumber: string;
//   date: Date;
//   // fromAccountId: Schema.Types.ObjectId;
//   // toAccountId: Schema.Types.ObjectId;
//   amount: number;
//   description?: string;
// }

// const creditNoteSchema = new Schema<ICreditNote>(
//   {
//     ...baseSchemaFields,

//     voucherNumber: { type: String },
//     date: { type: Date },
//     // fromAccountId: { type: Schema.Types.ObjectId, ref: "account" },
//     // toAccountId: { type: Schema.Types.ObjectId, ref: "account" },
//     amount: { type: Number, min: 0 },
//     description: { type: String, maxlength: 200 },
//   },
//   baseSchemaOptions,
// );

// export const creditNoteModel = mongoose.model<ICreditNote>("credit-note", creditNoteSchema);

export interface IAdjustmentNote {
  date: Date;
  amount: number;
  voucherNumber: string;
  bankAccountId: Schema.Types.ObjectId;
  description?: string;
  type: 'payin' | 'receiver';
  file?: string;
  phoneNo?: string;
}

const adjustmentNoteSchema = new Schema<IAdjustmentNote>({
  ...baseSchemaFields,
  voucherNumber: { type: String },
  date: { type: Date },
  amount: { type: Number, min: 0 },
  bankAccountId: { type: Schema.Types.ObjectId, ref: "bank" },
  description: { type: String },
  type: { type: String, enum: Object.values(ADJUSTMENT_TYPE) },
  file: { type: String },
  phoneNo: {
    countryCode: { type: String },
    phoneNo: { type: Number },
  },
}, baseSchemaOptions);

export const adjustmentNoteModel = mongoose.model<IAdjustmentNote>("adjustment-note", adjustmentNoteSchema);