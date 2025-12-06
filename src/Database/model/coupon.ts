import mongoose, { Schema } from "mongoose";
import { COUPON_DISCOUNT_TYPE, COUPON_STATUS } from "../../common";
import { ICoupon } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const couponSchema = new Schema<ICoupon>(
  {
    ...baseSchemaFields,
    code: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    discountType: { type: String, enum: COUPON_DISCOUNT_TYPE, required: true },
    discountValue: { type: Number, required: true },
    minOrderValue: { type: Number },
    maxDiscountAmount: { type: Number },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    status: { type: String, enum: COUPON_STATUS, default: "active" },
  },
  baseSchemaOptions
);

export const couponModel = mongoose.model<ICoupon>("coupon", couponSchema);
