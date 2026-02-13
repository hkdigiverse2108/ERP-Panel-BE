import { IBase } from "./base";
import { Schema } from "mongoose";

export interface ICoupon extends IBase {
  name?: string;
  customerIds?: { id: Schema.Types.ObjectId; count: number }[];
  expiryDays?: number;
  singleTimeUse?: boolean;
  startDate?: Date;
  endDate?: Date;
  usageLimit?: number;
  usedCount?: number;
  status?: "active" | "inactive" | "expired";

  couponPrice?: number;
  redemptionType?: "percentage" | "flat";
  redeemValue?: number;
}
