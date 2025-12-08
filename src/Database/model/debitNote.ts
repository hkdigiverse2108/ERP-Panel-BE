import mongoose, { Schema } from "mongoose";
import { IDebitNote } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { purchaseItemSchema } from "./purchaseOrder";

const debitNoteSchema = new Schema<IDebitNote>(
  {
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "contact", required: true },
    supplierName: { type: String },
    supplierBillId: { type: Schema.Types.ObjectId, ref: "supplierBill" },
    items: [purchaseItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    reason: { type: String },
    status: { type: String, default: "active" },
  },
  baseSchemaOptions
);

export const debitNoteModel = mongoose.model<IDebitNote>(
  "debitNote",
  debitNoteSchema
);
