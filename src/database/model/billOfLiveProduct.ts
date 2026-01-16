import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const billOfLiveProductSchema = new mongoose.Schema(
  {
    date: { type: String },
    number: { type: String },
    recipeId: [{ type: mongoose.Schema.Types.ObjectId, ref: "recipe" }],
    allowReverseCalculation: { type: Boolean },
    productDetails: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
        qty: { type: Number },
        purchasePrice: { type: Number },
        landingCost: { type: Number },
        mrp: { type: Number },
        sellingPrice: { type: Number },
        mfgDate: { type: String },
        expiryDays: { type: Number },
        expiryDate: { type: String },
        batchNo: { type: String },
        ingredients: [
          {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
            batch: { type: String },
            availableQty: { type: Number },
            useQty: { type: Number },
          },
        ],
      },
    ],
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

export const billOfLiveProductModel = mongoose.model("bill-of-live-product", billOfLiveProductSchema);
