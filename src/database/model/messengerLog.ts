import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IMessengerLog } from "../../types";
import { MESSENGER_LOG_STATUS, MESSENGER_TRIGGER_EVENT } from "../../common";

const messengerLogSchema = new Schema<IMessengerLog>(
  {
    ...baseSchemaFields,
    contactId: { type: Schema.Types.ObjectId, ref: "contact", required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "messengerTemplate", required: true },
    triggerEvent: { type: String, enum: Object.values(MESSENGER_TRIGGER_EVENT), default: MESSENGER_TRIGGER_EVENT.MANUAL },
    referenceType: { type: String },
    referenceId: { type: String },
    payloadSent: { type: Schema.Types.Mixed },
    status: { type: String, enum: Object.values(MESSENGER_LOG_STATUS), default: MESSENGER_LOG_STATUS.QUEUED },
    metaMessageId: { type: String },
    errorReason: { type: String },
    sentAt: { type: Date },
  },
  baseSchemaOptions,
);

messengerLogSchema.index({ contactId: 1, createdAt: -1 });

export const messengerLogModel = mongoose.model<IMessengerLog>("messengerLog", messengerLogSchema);
