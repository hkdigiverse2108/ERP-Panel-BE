import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { ITax } from "../../types";

const taxSchema = new Schema<ITax>(
  {
    ...baseCommonFields,
    name: { type: String },
    percentage: { type: Number },
  },
  baseSchemaOptions,
);

export const taxModel = mongoose.model<ITax>("tax", taxSchema);
