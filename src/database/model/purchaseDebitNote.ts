import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { salesItemSchema } from "./salesOrder";

export interface ISalesDebitNote {
  _id?: Schema.Types.ObjectId;
  documentNo: string;
  date: Date;
  customerId: Schema.Types.ObjectId;
  customerName?: string;
  invoiceId?: Schema.Types.ObjectId;
  items: any[];
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  roundOff: number;
  netAmount: number;
  reason?: string;
  status: string;
  isDeleted: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const purchaseDebitNoteSchema = new Schema(
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

export const  purchaseDebitNoteModel = mongoose.model("purchase-debit-note", purchaseDebitNoteSchema);
