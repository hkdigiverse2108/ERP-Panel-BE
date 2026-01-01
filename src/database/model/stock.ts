import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IBase } from "../../types";

export interface IStock extends IBase {
  productId: Schema.Types.ObjectId;
  variantId?: Schema.Types.ObjectId; // If variants exist
  batchNo?: string;
  qty: number;
  mfgDate?: Date;
  expiryDate?: Date;
  sellingPrice?: number; // Batch specific price
  mrp?: number;
}

const stockSchema = new Schema<IStock>(
  {
    ...baseSchemaFields,
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId },
    batchNo: { type: String },
    qty: { type: Number, default: 0 },
    mfgDate: { type: Date },
    expiryDate: { type: Date },
    sellingPrice: { type: Number },
    mrp: { type: Number },
  },
  baseSchemaOptions
);

export const stockModel = mongoose.model<IStock>("stock", stockSchema);
