import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { ITermsCondition } from "../../types";

const termsConditionSchema = new Schema<ITermsCondition>(
  {
    ...baseSchemaFields,
    termsCondition: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const termsConditionModel = mongoose.model<ITermsCondition>("terms-condition", termsConditionSchema);
