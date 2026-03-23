import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IPaymentTerms } from "../../types";

const paymentTermsSchema = new Schema<IPaymentTerms>(
  {
    ...baseSchemaFields,
    name: { type: String },
    day: { type: Number },
    isDefault: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

export const paymentTermsModel = mongoose.model<IPaymentTerms>("paymentTerms", paymentTermsSchema);
