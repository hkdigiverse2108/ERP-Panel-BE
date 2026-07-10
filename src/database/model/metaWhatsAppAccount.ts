import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const metaWhatsAppAccountSchema = new Schema(
  {
    ...baseSchemaFields,
    businessAccountId: { type: String, required: true },
    phoneNumberId: { type: String, required: true },
    displayPhoneNumber: { type: String },
    accessToken: { type: String, required: true },
    graphVersion: { type: String, default: "v23.0" },
    isDefault: { type: Boolean, default: false },
    lastTemplateSyncAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

metaWhatsAppAccountSchema.index({ companyId: 1, phoneNumberId: 1, isDeleted: 1 }, { unique: true });

export const metaWhatsAppAccountModel = mongoose.model("metaWhatsAppAccount", metaWhatsAppAccountSchema);
