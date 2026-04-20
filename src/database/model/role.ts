import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String },
    ...baseCommonFields,
    companyId: { type: Schema.Types.ObjectId, ref: "company", index: true },
  },
  baseSchemaOptions
);

export const roleModel = mongoose.model("role", roleSchema);
