import mongoose, { Schema } from "mongoose";
import { PRODUCT_EXPIRY_TYPE, PRODUCT_STATUS, PRODUCT_TYPE } from "../../common";
import { IProduct } from "../../types/product";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const productSchema = new Schema<IProduct>(
  {
    ...baseSchemaFields,
    itemCode: { type: String, index: true },
    name: { type: String, index: true },
    printName: { type: String },
    slug: { type: String, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "category" },
    subCategoryId: { type: Schema.Types.ObjectId, ref: "category" },
    brandId: { type: Schema.Types.ObjectId, ref: "brand" },
    subBrandId: { type: Schema.Types.ObjectId, ref: "brand" },
    departmentId: { type: Schema.Types.ObjectId, ref: "department" },

    productType: { type: String, enum: PRODUCT_TYPE, default: PRODUCT_TYPE[0] },

    uomId: { type: Schema.Types.ObjectId, ref: "uom", required: true },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    landingCost: { type: Number, default: 0 },

    hsnCode: { type: String },
    purchaseTaxId: { type: Schema.Types.ObjectId, ref: "tax" },
    salesTaxId: { type: Schema.Types.ObjectId, ref: "tax" },
    isPurchaseTaxInclusive: { type: Boolean, default: false },
    isSalesTaxInclusive: { type: Boolean, default: false },
    cessPercentage: { type: Number, default: 0 },

    manageBatch: { type: Boolean, default: false },
    hasExpiry: { type: Boolean, default: false },
    expiryDays: { type: Number },
    expiryType: { type: String, enum: PRODUCT_EXPIRY_TYPE },

    description: { type: String },
    shortDescription: { type: String },
    netWeight: { type: Number },
    nutritionInfo: { type: String },
    ingredients: { type: String },
    image: { type: String, default: null },

    status: { type: String, enum: PRODUCT_STATUS, default: PRODUCT_STATUS[0] },
  },
  baseSchemaOptions
);

export const productModel = mongoose.model<IProduct>("product", productSchema);
