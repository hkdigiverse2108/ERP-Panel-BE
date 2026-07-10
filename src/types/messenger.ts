import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IMessengerConfig extends IBase {
  pageId: string;
  pageAccessToken: string;
  appSecret: string;
  verifyToken: string;
  isConnected: boolean;
  connectedAt: Date;
}

export interface IMessengerTemplateVariable {
  paramName: string;
  exampleValue: string;
}

export interface IMessengerTemplateButton {
  type: "quick_reply" | "url" | "phone_number";
  text: string;
  url?: string;
  phoneNumber?: string;
  payload?: string;
}

export interface IMessengerTemplate extends IBase {
  name: string;
  metaTemplateId?: string;
  category: "UTILITY" | "MARKETING";
  language: string;
  parameterFormat: "NAMED" | "POSITIONAL";
  header: {
    format: "NONE" | "TEXT" | "IMAGE";
    text?: string;
    imageHandle?: string;
  };
  bodyText: string;
  variables: IMessengerTemplateVariable[];
  buttons: IMessengerTemplateButton[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "DELETED";
  rejectionReason?: string;
}

export interface IMessengerLog extends IBase {
  contactId: Schema.Types.ObjectId;
  templateId: Schema.Types.ObjectId;
  triggerEvent: "POS_ORDER_CREATED" | "INVOICE_CREATED" | "DELIVERY_CHALLAN_CREATED" | "MANUAL";
  referenceType?: string;
  referenceId?: string;
  payloadSent: Record<string, any>;
  status: "QUEUED" | "SENT" | "FAILED" | "DELIVERED" | "READ";
  metaMessageId?: string;
  errorReason?: string;
  sentAt?: Date;
}
