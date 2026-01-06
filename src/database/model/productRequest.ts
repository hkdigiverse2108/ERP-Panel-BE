import mongoose, { Schema } from "mongoose";
import { PRODUCT_REQUEST_STATUS, PRODUCT_TYPE } from "../../common";
import { baseCommonFields, baseSchemaOptions } from "./base";

const productRequestSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "company" },
    images: [{ type: String }],
    productType: { type: String, enum: Object.values(PRODUCT_TYPE), default: PRODUCT_TYPE.FINISHED },

    name: { type: String, required: true, index: true },
    printName: { type: String },

    category: { type: String },
    subCategory: { type: String },
    brand: { type: String },
    subBrand: { type: String },

    hasExpiry: { type: Boolean, default: false },

    description: { type: String },
    Price: { type: Number },
    status: { type: String, enum: Object.values(PRODUCT_REQUEST_STATUS), default: PRODUCT_REQUEST_STATUS.PENDING },
    ...baseCommonFields,
  },
  baseSchemaOptions
);

export const productRequestModel = mongoose.model("product-request", productRequestSchema);
