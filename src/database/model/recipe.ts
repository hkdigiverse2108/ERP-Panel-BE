import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IRecipe } from "../../types";
import { RECIPE_TYPE } from "../../common";

const recipeSchema = new Schema<IRecipe>(
  {
    ...baseSchemaFields,

    name: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    number: { type: String, required: true },

    type: {
      type: String,
      enum: Object.values(RECIPE_TYPE),
      required: true,
    },

    rawProducts: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        mrp: { type: Number, default: 0 },
        useQty: { type: Number, required: true },
      },
    ],

    finalProducts: {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "product",
        required: true,
      },
      mrp: { type: Number, default: 0 },
      qtyGenerate: { type: Number, required: true },
    },
  },
  baseSchemaOptions
);

export const recipeModel = mongoose.model<IRecipe>("recipe", recipeSchema);
