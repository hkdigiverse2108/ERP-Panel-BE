import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const metaMessageLogSchema = new Schema(
  {
    ...baseSchemaFields,
    contactId: { type: Schema.Types.ObjectId, ref: "contact", default: null, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: "metaWhatsAppAccount", default: null },
    templateId: { type: Schema.Types.ObjectId, ref: "metaMessageTemplate", default: null },
    sourceType: { type: String, enum: ["POS_BILL", "CONTACT_BULK", "INVOICE", "CUSTOM"], required: true },
    sourceId: { type: Schema.Types.ObjectId, default: null },
    recipientName: { type: String },
    recipientPhone: { type: String, index: true },
    messageType: { type: String, enum: ["template", "text", "document"], default: "template" },
    status: { type: String, enum: ["queued", "sent", "failed", "skipped"], default: "queued", index: true },
    metaMessageId: { type: String },
    requestPayload: { type: Object, default: {} },
    responsePayload: { type: Object, default: {} },
    errorCode: { type: String },
    errorMessage: { type: String },
    fileUrl: { type: String },
    pricing: { type: Object, default: {} },
    conversationCategory: { type: String },
    billedAmount: { type: Number },
    sentAt: { type: Date },
  },
  baseSchemaOptions,
);

export const metaMessageLogModel = mongoose.model("metaMessageLog", metaMessageLogSchema);
