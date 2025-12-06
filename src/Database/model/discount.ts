import mongoose, { Schema } from "mongoose";
import { DISCOUNT_STATUS, DISCOUNT_TYPE } from "../../common";
import { IDiscount } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const discountSchema = new Schema<IDiscount>(
  {
    ...baseSchemaFields,
    title: { type: String, required: true },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    discountType: { type: String, enum: DISCOUNT_TYPE, required: true },
    discountValue: { type: Number, required: true },
    status: { type: String, enum: DISCOUNT_STATUS, default: "active" },
  },
  baseSchemaOptions
);

export const discountModel = mongoose.model<IDiscount>(
  "discount",
  discountSchema
);
