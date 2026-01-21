import mongoose, { Schema } from "mongoose";
import { IStockVerification, IStockVerificationItem } from "../../types/stockVerification";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const stockVerificationItemSchema = new Schema<IStockVerificationItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    batchNo: { type: String },
    landingCost: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    unit: { type: String },
    systemQty: { type: Number, default: 0 },
    physicalQty: { type: Number, required: true, default: 0 },
    differenceQty: { type: Number, default: 0 },
    differenceAmount: { type: Number, default: 0 },
  },
  { _id: false },
);

const stockVerificationSchema = new Schema<IStockVerification>(
  {
    ...baseSchemaFields,
    stockVerificationNo: { type: String, required: true, unique: true, index: true },
    verificationDate: { type: Date, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "department" },
    categoryId: { type: Schema.Types.ObjectId, ref: "category" },
    brandId: { type: Schema.Types.ObjectId, ref: "brand" },
    remark: { type: String },
    items: [stockVerificationItemSchema],
    totalProducts: { type: Number, default: 0 },
    totalPhysicalQty: { type: Number, default: 0 },
    differenceAmount: { type: Number, default: 0 },
    approvedQty: { type: Number },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  baseSchemaOptions,
);

export const stockVerificationModel = mongoose.model<IStockVerification>("stock-verification", stockVerificationSchema);
