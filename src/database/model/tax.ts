import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { ITax } from "../../types";

const taxSchema = new Schema<ITax>(
  {
    name: { type: String },
    percentage: { type: Number },
    companyId: { type: Schema.Types.ObjectId, ref: "company", index: true },
    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const taxModel = mongoose.model<ITax>("tax", taxSchema);
