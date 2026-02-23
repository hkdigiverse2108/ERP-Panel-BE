import { Schema } from "mongoose";
import { IBase } from "./base";

export type LoginLogEventType = "LOGIN" | "FINANCIAL_YEAR_UPDATE";

export interface ILoginLog extends IBase {
  userId: Schema.Types.ObjectId;
  message: string;
  ipAddress: string;
  systemDetails: string;
  eventType: LoginLogEventType;
}