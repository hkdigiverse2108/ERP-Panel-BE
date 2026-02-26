import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IEstimate } from "../../types";
import { salesItemSchema } from "./salesOrder";

const EstimateSchema = new Schema<IEstimate>(
  {
    ...baseSchemaFields,
    documentNo: { type: String, index: true },
    date: { type: Date },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: "contact" },
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