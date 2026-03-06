import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    title: { type: String },
    message: { type: String },
    eventType: { type: String },
    meta: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
    ...baseSchemaFields,
  },
  baseSchemaOptions,
);

export const notificationModel = mongoose.model("notification", notificationSchema);
