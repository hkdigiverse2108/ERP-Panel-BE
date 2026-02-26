import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions, transactionSummarySchema, commonAdditionalChargeSchema } from "./base";
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
    invoiceId: { type: Schema.Types.ObjectId, ref: "invoice" },
    items: [salesItemSchema],
    transectionSummary: { type: transactionSummarySchema },
    additionalCharges: { type: [commonAdditionalChargeSchema] },
    reason: { type: String },
    status: { type: String, default: "active" },
  },
  baseSchemaOptions,
);

export const salesCreditNoteModel = mongoose.model<ISalesCreditNote>("sales-credit-note", salesCreditNoteSchema);
