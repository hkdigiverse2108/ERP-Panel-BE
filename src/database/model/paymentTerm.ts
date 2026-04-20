import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { IPaymentTerms } from "../../types";

const paymentTermsSchema = new Schema<IPaymentTerms>(
  {
    name: { type: String },
    day: { type: Number },
    isDefault: { type: Boolean, default: true },
    companyId: { type: Schema.Types.ObjectId, ref: "company", index: true },
    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const paymentTermsModel = mongoose.model<IPaymentTerms>("paymentTerms", paymentTermsSchema);
