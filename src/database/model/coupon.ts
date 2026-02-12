import mongoose, { Schema } from "mongoose";
import { COUPON_DISCOUNT_TYPE, COUPON_STATUS } from "../../common";
import { ICoupon } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const couponSchema = new Schema<ICoupon>(
  {
    ...baseSchemaFields,

    name: { type: String },
    couponPrice: {
      type: Number,
    },
    redemptionType: {
      type: String,
      enum: Object.values(COUPON_DISCOUNT_TYPE),
    },
    redeemValue: {
      type: Number,
    },
    singleTimeUse: { type: Boolean, default: false },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    expiryDays: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(COUPON_STATUS),
      default: COUPON_STATUS.ACTIVE,
    },
  },
  baseSchemaOptions,
);

export const couponModel = mongoose.model<ICoupon>("coupon", couponSchema);
