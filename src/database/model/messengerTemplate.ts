import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IMessengerTemplate } from "../../types";
import { MESSENGER_TEMPLATE_CATEGORY, MESSENGER_TEMPLATE_STATUS, MESSENGER_TEMPLATE_HEADER_FORMAT, MESSENGER_BUTTON_TYPE } from "../../common";

const messengerTemplateSchema = new Schema<IMessengerTemplate>(
  {
    ...baseSchemaFields,
    name: { type: String, required: true },
    metaTemplateId: { type: String },
    category: { type: String, enum: Object.values(MESSENGER_TEMPLATE_CATEGORY), default: MESSENGER_TEMPLATE_CATEGORY.UTILITY },
    language: { type: String, required: true },
    parameterFormat: { type: String, enum: ["NAMED", "POSITIONAL"], default: "NAMED" },
    header: {
      format: { type: String, enum: Object.values(MESSENGER_TEMPLATE_HEADER_FORMAT), default: MESSENGER_TEMPLATE_HEADER_FORMAT.NONE },
      text: { type: String },
      imageHandle: { type: String },
    },
    bodyText: { type: String, required: true },
    variables: [{
      paramName: { type: String },
      exampleValue: { type: String },
    }],
    buttons: [{
      type: { type: String, enum: Object.values(MESSENGER_BUTTON_TYPE) },
      text: { type: String },
      url: { type: String },
      phoneNumber: { type: String },
      payload: { type: String },
    }],
    status: { type: String, enum: Object.values(MESSENGER_TEMPLATE_STATUS), default: MESSENGER_TEMPLATE_STATUS.PENDING },
    rejectionReason: { type: String },
  },
  baseSchemaOptions,
);

export const messengerTemplateModel = mongoose.model<IMessengerTemplate>("messengerTemplate", messengerTemplateSchema);
