import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IMessengerConfig } from "../../types";

const messengerConfigSchema = new Schema<IMessengerConfig>(
  {
    ...baseSchemaFields,
    pageId: { type: String, required: true },
    pageAccessToken: { type: String, required: true },
    appSecret: { type: String, required: true },
    verifyToken: { type: String, required: true },
    isConnected: { type: Boolean, default: false },
    connectedAt: { type: Date },
  },
  baseSchemaOptions,
);

messengerConfigSchema.index({ branchId: 1, companyId: 1 }, { unique: true });

export const messengerConfigModel = mongoose.model<IMessengerConfig>("messengerConfig", messengerConfigSchema);
