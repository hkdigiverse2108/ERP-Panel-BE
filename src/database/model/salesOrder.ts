import mongoose, { Schema } from "mongoose";
import { IEstimate, ISalesOrder } from "../../types/sales";
import { baseSchemaFields, baseSchemaOptions } from "./base";

// Shared Item Schema for Sales Documents
export const salesItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    productName: { type: String, required: true }, // Snapshot
    batchNo: { type: String },
    qty: { type: Number, required: true },
    freeQty: { type: Number, default: 0 },
    uom: { type: String }, // Snapshot
    price: { type: Number, required: true }, // Unit Price
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxId: { type: Schema.Types.ObjectId, ref: "tax" },
    taxPercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
  },
  { _id: false },
);

// Estimate Schema

const EstimateSchema = new Schema<IEstimate>(
  {
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: "contact", required: true },
    customerName: { type: String },
    items: [salesItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    notes: { type: String },
    status: { type: String, default: "pending" }, // Pending, Converted, Cancelled
  },
  baseSchemaOptions,
);

export const EstimateModel = mongoose.model<IEstimate>("estimate", EstimateSchema);

// Sales Order Schema

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: "contact", required: true },
    customerName: { type: String },
    items: [salesItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    notes: { type: String },
    status: { type: String, default: "pending" }, // Pending, Completed, Cancelled
  },
  baseSchemaOptions,
);

export const SalesOrderModel = mongoose.model<ISalesOrder>("sales-order", SalesOrderSchema);
