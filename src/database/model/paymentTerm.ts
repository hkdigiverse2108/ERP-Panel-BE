import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IPaymentTerm } from "../../types";

const paymentTermSchema = new Schema<IPaymentTerm>(
  {
    ...baseSchemaFields,
    name: { type: String, required: true },
    day: { type: Number, required: true },
  },
  baseSchemaOptions
);

export const paymentTermModel = mongoose.model<IPaymentTerm>("payment-term", paymentTermSchema);
