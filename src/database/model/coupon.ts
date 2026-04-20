import mongoose, { Schema } from "mongoose";
import { COUPON_DISCOUNT_TYPE, COUPON_STATUS } from "../../common";
import { ICoupon } from "../../types";
import { baseCommonFields, baseSchemaOptions } from "./base";

const couponSchema = new Schema<ICoupon>(
  {
    customerIds: [{ id: { type: mongoose.Schema.Types.ObjectId, ref: "contact" }, count: { type: Number }, _id: false }],
    name: { type: String },
    couponPrice: { type: Number },
    redemptionType: { type: String, enum: Object.values(COUPON_DISCOUNT_TYPE) },
    redeemValue: { type: Number },
    singleTimeUse: { type: Boolean, default: false },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    expiryDays: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: Object.values(COUPON_STATUS), default: COUPON_STATUS.ACTIVE },
    companyId: { type: Schema.Types.ObjectId, ref: "company", index: true },
    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const couponModel = mongoose.model<ICoupon>("coupon", couponSchema);
