import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { ILoyaltyCampaign } from "../../types";
import { LOYALTY_REDEMPTION_TYPE, LOYALTY_TYPE } from "../../common";

const loyaltySchema = new Schema<ILoyaltyCampaign>(
  {
    ...baseSchemaFields,

    customerIds: [{ id: { type: mongoose.Schema.Types.ObjectId, ref: "contact" }, count: { type: Number }, _id: false }],
    name: { type: String },
    description: { type: String, maxlength: 200 },

    type: {
      type: String,
      enum: Object.values(LOYALTY_TYPE),
    },

    discountValue: { type: Number },
    redemptionPoints: { type: Number },

    redemptionPerCustomer: {
      type: String,
      enum: Object.values(LOYALTY_REDEMPTION_TYPE),
      default: LOYALTY_REDEMPTION_TYPE.MULTIPLE,
    },

    campaignLaunchDate: { type: Date },
    campaignExpiryDate: { type: Date },

    minimumPurchaseAmount: { type: Number },

    usedCount: { type: Number, default: 0 },
    usageLimit: { type: Number },
  },
  baseSchemaOptions,
);

export const loyaltyModel = mongoose.model<ILoyaltyCampaign>("loyalty", loyaltySchema);
