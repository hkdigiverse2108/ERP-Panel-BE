import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { IProductType } from "../../types";

const productTypeSchema = new Schema<IProductType>(
  {
    name: { type: String, required: true },
    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const productTypeModel = mongoose.model<IProductType>("product-type", productTypeSchema);
