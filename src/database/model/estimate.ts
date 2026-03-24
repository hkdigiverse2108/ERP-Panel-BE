import mongoose, { Schema } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  transactionSummarySchema,
  commonAdditionalChargeSchema,
  salesItemSchema,
  commonShippingSchema,
} from "./base";
import { ESTIMATE_STATUS, TAX_TYPE } from "../../common";
import { IEstimate } from "../../types";

const EstimateSchema = new Schema<IEstimate>(
  {
    ...baseSchemaFields,
    estimateNo: { type: String, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    placeOfSupply: { type: String },
    billingAddress: { type: Schema.Types.ObjectId },
    shippingAddress: { type: Schema.Types.ObjectId },
    customerId: { type: Schema.Types.ObjectId, ref: "contact" },
    items: [salesItemSchema],
    termsAndConditionIds: [{ type: Schema.Types.ObjectId, ref: "terms-condition" }],
    reverseCharge: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(ESTIMATE_STATUS), default: ESTIMATE_STATUS.PENDING },
    transactionSummary: { type: transactionSummarySchema },
    additionalCharges: { type: [commonAdditionalChargeSchema] },
    paymentTermsId: { type: mongoose.Schema.Types.ObjectId, ref: "paymentTerms" },
    taxType: { type: String, enum: Object.values(TAX_TYPE), default: TAX_TYPE.DEFAULT },
    sez: { type: String },
    shippingDetails: { type: commonShippingSchema },
    notes: { type: String },
  },
  baseSchemaOptions,
);

export const EstimateModel = mongoose.model<IEstimate>("estimate", EstimateSchema);