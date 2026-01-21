import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IBase, ILoyaltyCampaign } from "../../types";
import { LOYALTY_STATUS, LOYALTY_TYPE } from "../../common";

const loyaltyCampaignSchema = new Schema<ILoyaltyCampaign>(
  {
    ...baseSchemaFields,
    name: { type: String, required: true },
    type: { type: String, enum: Object.values(LOYALTY_TYPE), required: true },
    earningRatio: { type: Number, required: true },
    redemptionRatio: { type: Number, required: true },
    minRedemptionPoints: { type: Number },
    status: { type: String, enum: Object.values(LOYALTY_STATUS), default: LOYALTY_STATUS.ACTIVE },
  },
  baseSchemaOptions,
);

export const loyaltyCampaignModel = mongoose.model<ILoyaltyCampaign>("loyalty-campaign", loyaltyCampaignSchema);
