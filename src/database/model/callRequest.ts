import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const callRequestSchema = new Schema(
  {
    ...baseSchemaFields,
    businessName: { type: String },
    contactName: { type: String },
    contactNo: { type: String },
    note: { type: String },
  },
  baseSchemaOptions
);

export const callRequestModel = mongoose.model("call-request", callRequestSchema);
