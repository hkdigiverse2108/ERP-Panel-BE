import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

export const roleModel = mongoose.model("role", roleSchema);
