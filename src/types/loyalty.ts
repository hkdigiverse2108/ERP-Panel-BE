import { IBase } from "./base";

export interface ILoyaltyCampaign extends IBase {
  name: string;
  type: "points" | "cashback";
  earningRatio: number; // e.g., 1 point per 100 currency
  redemptionRatio: number; // e.g., 1 currency per 1 point
  minRedemptionPoints?: number;
  status: "active" | "inactive";
}