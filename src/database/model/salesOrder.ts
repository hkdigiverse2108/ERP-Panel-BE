import mongoose, { Schema } from "mongoose";
import { IEstimate, ISalesOrder } from "../../types/sales";
import { baseSchemaFields, baseSchemaOptions, commonAdditionalChargeSchema, transactionSummarySchema } from "./base";

// Shared Item Schema for Sales Documents
export const salesItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    productName: { type: String }, // Snapshot
    batchNo: { type: String },
    qty: { type: Number },
    freeQty: { type: Number, default: 0 },
    uom: { type: String }, // Snapshot
    price: { type: Number }, // Unit Price
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxId: { type: Schema.Types.ObjectId, ref: "tax" },
    taxPercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number },
    totalAmount: { type: Number },
  },
  { _id: false },
);

// Sales Order Schema

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    ...baseSchemaFields,
    documentNo: { type: String, index: true },
    date: { type: Date },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: "contact" },
    items: [salesItemSchema],
    transectionSummary: { type: transactionSummarySchema },
    additionalCharges: { type: [commonAdditionalChargeSchema] },
    notes: [{ type: String }],
    status: { type: String, default: "pending" }, // Pending, Completed, Cancelled
  },
  baseSchemaOptions,
);

export const SalesOrderModel = mongoose.model<ISalesOrder>("sales-order", SalesOrderSchema);
