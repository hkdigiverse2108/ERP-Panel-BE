import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

// POS Cash Control Schema - Tracks daily opening/closing cash for each branch
const posCashControlSchema = new Schema(
  {
    ...baseSchemaFields,
    branchId: { type: Schema.Types.ObjectId, ref: "branch", required: true, index: true }, // Branch/Location
    date: { type: Date, required: true, index: true }, // Date for which cash control is set
    openingCash: { type: Number, default: 0 }, // Opening cash balance
    closingCash: { type: Number, default: 0 }, // Closing cash balance (calculated)
    expectedCash: { type: Number, default: 0 }, // Expected cash (opening + sales - expenses)
    actualCash: { type: Number, default: 0 }, // Actual cash counted
    difference: { type: Number, default: 0 }, // Difference between expected and actual
    notes: { type: String },
    isClosed: { type: Boolean, default: false }, // Whether cash control is closed for the day
    closedBy: { type: Schema.Types.ObjectId, ref: "user" },
    closedAt: { type: Date },
  },
  baseSchemaOptions,
);

// Compound index to ensure one cash control per branch per day
posCashControlSchema.index({ branchId: 1, date: 1, companyId: 1 }, { unique: true });

export const PosCashControlModel = mongoose.model("pos-cash-control", posCashControlSchema);
