import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";

const monthlySpecialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: null },

    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const monthlySpecialModel = mongoose.model("monthlySpecial", monthlySpecialSchema);
