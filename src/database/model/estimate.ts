import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions, transactionSummarySchema, commonAdditionalChargeSchema } from "./base";
import { ESTIMATE_STATUS } from "../../common";
import { IEstimate } from "../../types";
import { salesItemSchema } from "./salesOrder";

const EstimateSchema = new Schema<IEstimate>(
  {
    ...baseSchemaFields,
    estimateNo: { type: String, index: true },
    date: { type: Date },
    dueDate: { type: Date },
    placeOfSupply: { type: String },
    billingAddress: { type: Schema.Types.ObjectId },
    shippingAddress: { type: Schema.Types.ObjectId },
    customerId: { type: Schema.Types.ObjectId, ref: "contact" },
    items: [salesItemSchema],
    notes: [{ type: String }],
    reverseCharge: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(ESTIMATE_STATUS), default: ESTIMATE_STATUS.PENDING },
    transectionSummary: { type: transactionSummarySchema },
    additionalCharges: { type: [commonAdditionalChargeSchema] },
    paymentTerms: [{ type: Schema.Types.ObjectId, ref: "payment-term" }],
    taxType: { type: String },
    sez: { type: String },
  },
  baseSchemaOptions,
);

export const EstimateModel = mongoose.model<IEstimate>("estimate", EstimateSchema);