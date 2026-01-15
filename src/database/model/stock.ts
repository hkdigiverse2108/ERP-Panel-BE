import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IBase } from "../../types";

export interface IStock extends IBase {
  productId: Schema.Types.ObjectId;
  variantId?: Schema.Types.ObjectId; // If variants exist
  qty: number;
  purchasePrice: number;
  landingCost: number;
  mrp: number;
  sellingDiscount: number;
  sellingPrice: number;
  sellingMargin: number;
  uomId: Schema.Types.ObjectId;
}

const stockSchema = new Schema<IStock>(
  {
    ...baseSchemaFields,
    productId: { type: Schema.Types.ObjectId, ref: "product", index: true },
    uomId: { type: Schema.Types.ObjectId, ref: "uom", index: true },
    variantId: { type: Schema.Types.ObjectId },
    purchasePrice: { type: Number, default: 0 },
    landingCost: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    sellingDiscount: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    sellingMargin: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
  },
  baseSchemaOptions
);

export const stockModel = mongoose.model<IStock>("stock", stockSchema);
