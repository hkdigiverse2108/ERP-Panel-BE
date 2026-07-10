import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const metaMessageTemplateSchema = new Schema(
  {
    ...baseSchemaFields,
    accountId: { type: Schema.Types.ObjectId, ref: "metaWhatsAppAccount", required: true, index: true },
    metaTemplateId: { type: String },
    name: { type: String, required: true },
    language: { type: String, default: "en_US" },
    category: { type: String, enum: ["UTILITY", "MARKETING", "AUTHENTICATION"], default: "UTILITY" },
    status: { type: String, default: "DRAFT" },
    components: { type: Array, default: [] },
    localVariables: { type: Array, default: [] },
    useFor: { type: String, enum: ["POS_BILL", "CONTACT_BULK", "INVOICE", "CUSTOM"], default: "CUSTOM" },
    sendAttachment: { type: Boolean, default: false },
    attachmentType: { type: String, enum: ["pdf", "image", "document", "none"], default: "pdf" },
    companyIds: [{ type: Schema.Types.ObjectId, ref: "company" }],
  },
  baseSchemaOptions,
);

metaMessageTemplateSchema.index({ name: 1, language: 1, isDeleted: 1 }, { unique: true });

export const metaMessageTemplateModel = mongoose.model("metaMessageTemplate", metaMessageTemplateSchema);
