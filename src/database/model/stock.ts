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

  purchaseTaxId: Schema.Types.ObjectId;
  salesTaxId: Schema.Types.ObjectId;

  isPurchaseTaxIncluding: boolean;
  isSalesTaxIncluding: boolean;
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
    qty: { type: Number, default: 0, min: 0 },

    purchaseTaxId: { type: Schema.Types.ObjectId, ref: "tax" },
    salesTaxId: { type: Schema.Types.ObjectId, ref: "tax" },

    isPurchaseTaxIncluding: { type: Boolean, default: false },
    isSalesTaxIncluding: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const stockModel = mongoose.model<IStock>("stock", stockSchema);
