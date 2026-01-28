import mongoose, { Schema } from "mongoose";
import { IStockVerification, IStockVerificationItem } from "../../types/stockVerification";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { APPROVAL_STATUS } from "../../common";

const stockVerificationItemSchema = new Schema<IStockVerificationItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    landingCost: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    systemQty: { type: Number, default: 0 },
    physicalQty: { type: Number, required: true, default: 0 },
    differenceQty: { type: Number, default: 0 },
    approvedQty: { type: Number },
    differenceAmount: { type: Number, default: 0 },
  },
  { _id: false },
);

const stockVerificationSchema = new Schema<IStockVerification>(
  {
    ...baseSchemaFields,
    stockVerificationNo: { type: String, required: true, index: true },
    remark: { type: String },
    items: [stockVerificationItemSchema],
    totalProducts: { type: Number, default: 0 },
    totalPhysicalQty: { type: Number, default: 0 },
    totalDifferenceAmount: { type: Number, default: 0 },
    totalApprovedQty: { type: Number },
    status: { type: String, enum: Object.values(APPROVAL_STATUS), default: APPROVAL_STATUS.PENDING },
  },
  baseSchemaOptions,
);

export const stockVerificationModel = mongoose.model<IStockVerification>("stock-verification", stockVerificationSchema);
