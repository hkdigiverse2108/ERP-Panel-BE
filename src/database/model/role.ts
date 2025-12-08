import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";

const roleSchema = new mongoose.Schema(
  {
    role: { type: String },
    
    ...baseCommonFields,
  },
  baseSchemaOptions
);

export const roleModel = mongoose.model("role", roleSchema);
