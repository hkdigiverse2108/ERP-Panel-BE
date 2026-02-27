import mongoose, { Schema } from "mongoose";
import { IEstimate, ISalesOrder } from "../../types/sales";
import {
  baseSchemaFields,
  baseSchemaOptions,
  commonAdditionalChargeSchema,
  transactionSummarySchema,
  salesItemSchema,
} from "./base";

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
