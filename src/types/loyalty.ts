import { IBase } from "./base";

export interface ILoyaltyCampaign extends IBase {
  name: string;
  description?: string;
  customerIds: { id: any; count: number }[];
  type: "points" | "cashback";
  discountValue?: number;
  redemptionPoints?: number;
  redemptionPerCustomer: "single" | "multiple";
  campaignLaunchDate: Date;
  campaignExpiryDate?: Date;
  minimumPurchaseAmount: number;
  status: "active" | "inactive";
  usedCount?: number;
  usageLimit?: number;
}

export interface ILoyaltyPoints extends IBase {
  amount: number;
  points: number;
}
