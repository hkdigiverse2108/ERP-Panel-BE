import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { salesItemSchema } from "./salesOrder";

// POS Order Schema
const posOrderSchema = new Schema(
  {
    ...baseSchemaFields,
    orderNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    tableNo: { type: String }, // Table number if applicable
    customerId: { type: Schema.Types.ObjectId, ref: "contact" }, // Optional - for walk-in customers
    customerName: { type: String },
    items: [salesItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["cash", "card", "upi", "wallet", "credit"], default: "cash" },
    paymentStatus: { type: String, enum: ["paid", "unpaid", "partial"], default: "paid" },
    status: { type: String, enum: ["pending", "completed", "hold", "cancelled"], default: "pending" },
    holdDate: { type: Date }, // When order was put on hold
    notes: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: "invoice" }, // Linked invoice if converted
  },
  baseSchemaOptions
);

export const PosOrderModel = mongoose.model("posOrder", posOrderSchema);
