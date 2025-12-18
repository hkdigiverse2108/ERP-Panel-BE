import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IRecipe } from "../../types";
import { RECIPE_TYPE } from "../../common";

const recipeSchema = new Schema<IRecipe>(
  {
    ...baseSchemaFields,

    recipeName: { type: String, required: true, index: true },
    recipeDate: { type: Date, required: true },
    recipeNo: { type: String, required: true, unique: true, index: true },

    recipeType: {
      type: String,
      enum: RECIPE_TYPE,
      required: true,
    },

    rawProducts: [
      {
        itemCode: { type: String },
        productId: {
          type: Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        mrp: { type: Number, default: 0 },
        useQty: { type: Number, required: true },
      },
    ],

    finalProducts: [
      {
        itemCode: { type: String },
        productId: {
          type: Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        mrp: { type: Number, default: 0 },
        qtyGenerate: { type: Number, required: true },
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  baseSchemaOptions
);

export const recipeModel = mongoose.model<IRecipe>(
  "recipe",
  recipeSchema
);
