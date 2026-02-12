import { IBase } from "./base";

export interface ICoupon extends IBase {
  name?: string;
  expiryDays?: number;
  singleTimeUse?: boolean;
  startDate?: Date;
  endDate?: Date;
  usageLimit?: number;
  usedCount?: number;
  status?: "active" | "inactive";

  couponPrice?: number;
  redemptionType?: "percentage" | "flat";
  redeemValue?: number;
}
