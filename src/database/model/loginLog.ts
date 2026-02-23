import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { ILoginLog } from "../../types";

const loginLogSchema = new Schema<ILoginLog>(
  {
    ...baseSchemaFields,
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
    message: { type: String, required: true },
    ipAddress: { type: String },
    systemDetails: { type: String },
    eventType: {
      type: String,
      enum: ["LOGIN", "FINANCIAL_YEAR_UPDATE"],
      default: "LOGIN",
      index: true,
    },
  },
  baseSchemaOptions,
);

export const loginLogModel = mongoose.model<ILoginLog>("login-log", loginLogSchema);