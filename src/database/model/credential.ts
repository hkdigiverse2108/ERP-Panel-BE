import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";

const credentialSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, unique: true },
    publishableKey: { type: String, required: true },
    supabaseUrl: { type: String, required: true },
    lastUsed: { type: Date, default: null }, // Track last usage for rotation

    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const credentialModel = mongoose.model("credential", credentialSchema);
