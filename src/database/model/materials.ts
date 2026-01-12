import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const materialSchema = new Schema(
  {
    ...baseSchemaFields,

    materialNo: { type: String },
    materialDate: { type: Date },
    description: { type: String },
    materialTaken: [
      {
        productId: { type: String },
        qty: { type: Number },
        mrp: { type: Number },
        unitCost: { type: Number },
        landingPrice: { type: Number },
        salesRate: { type: Number },
        taxRate: { type: Number },
        totalAmount: { type: Number },
      },
    ],
    materialTakenTotalAmount: { type: Number },
    goodsReceived: [
      {
        productId: { type: String },
        qty: { type: Number },
        mrp: { type: Number },
        batch: { type: String },
        unitCost: { type: Number },
        landingPrice: { type: Number },
        salesRate: { type: Number },
        taxRate: { type: Number },
        totalAmount: { type: Number },
      },
    ],
    goodsReceivedTotalAmount: { type: Number },
  },
  baseSchemaOptions
);

export const materialModel = mongoose.model("material", materialSchema);
