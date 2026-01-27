import mongoose, { Schema } from "mongoose";
import { DISCOUNT_STATUS, VALUE_TYPE } from "../../common";
import { IDiscount } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const discountSchema = new Schema<IDiscount>(
  {
    ...baseSchemaFields,
    title: { type: String, required: true },
    validFrom: { type: Date },
    validTo: { type: Date },
    discountType: { type: String, enum: Object.values(VALUE_TYPE), default: VALUE_TYPE.PERCENTAGE },
    discountValue: { type: Number, required: true },
    status: { type: String, enum: Object.values(DISCOUNT_STATUS), default: DISCOUNT_STATUS.ACTIVE },
  },
  baseSchemaOptions,
);

export const discountModel = mongoose.model<IDiscount>("discount", discountSchema);
