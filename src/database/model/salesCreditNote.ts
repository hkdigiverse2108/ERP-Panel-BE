import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { salesItemSchema } from "./salesOrder";
import { ISalesDocument } from "../../types";

export interface ISalesCreditNote extends ISalesDocument {
  invoiceId?: Schema.Types.ObjectId;
  reason: string;
}

const salesCreditNoteSchema = new Schema<ISalesCreditNote>(
  {
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "contact", required: true },
    customerName: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: "invoice" },
    items: [salesItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    reason: { type: String },
    status: { type: String, default: "active" },
  },
  baseSchemaOptions,
);

export const salesCreditNoteModel = mongoose.model<ISalesCreditNote>("sales-credit-note", salesCreditNoteSchema);
