import mongoose, { Schema } from "mongoose";
import { BARCODE_TYPE, PRODUCT_EXPIRY_TYPE, PRODUCT_TYPE } from "../../common";
import { IProduct } from "../../types";
import { baseCommonFields, baseSchemaOptions } from "./base";

export const variantSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, sparse: true },
    itemCode: { type: String },
    barcode: { type: String, unique: true, sparse: true },
    barcodeType: { type: String, enum: Object.values(BARCODE_TYPE) },
    attributes: [{ key: { type: String }, value: { type: String } }],
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deductFromParent: { type: Boolean, default: true },
    parentStockRatio: { type: Number, default: 1 },
  }
);

const productSchema = new Schema<IProduct>(
  {
    ...baseCommonFields,
    companyId: { type: Schema.Types.ObjectId, ref: "company", index: true },
    images: [{ type: String }],
    itemCode: { type: String, index: true },
    productType: { type: String, enum: Object.values(PRODUCT_TYPE), default: PRODUCT_TYPE.FINISHED },

    name: { type: String, required: true, index: true },
    printName: { type: String },

    categoryId: { type: Schema.Types.ObjectId, ref: "category" },
    subCategoryId: { type: Schema.Types.ObjectId, ref: "category" },
    brandId: { type: Schema.Types.ObjectId, ref: "brand" },
    subBrandId: { type: Schema.Types.ObjectId, ref: "brand" },
    productTypeId: { type: Schema.Types.ObjectId, ref: "product-type" },

    hsnCode: { type: String },
    sku: { type: String },

    cessPercentage: { type: Number, default: 0 },

    manageMultipleBatch: { type: Boolean, default: false },
    isExpiryProductSaleable: { type: Boolean, default: true },
    hasExpiry: { type: Boolean, default: false },

    expiryDays: { type: Number },
    calculateExpiryOn: { type: String, enum: PRODUCT_EXPIRY_TYPE },
    expiryReferenceDate: { type: Date },
    calculatedExpiryDate: { type: Date },

    ingredients: [{ type: String }],
    description: { type: String },
    shortDescription: { type: String },

    netWeight: { type: Number },
    nutrition: [{ name: String, value: String }],

    masterQty: { type: Number, default: 0 },

    stockIds: [{ type: Schema.Types.ObjectId, ref: "stock", default: null }],

    // Pricing Details
    purchasePrice: { type: Number, default: 0 },
    landingCost: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    sellingDiscount: { type: Number, default: 0 },
    sellingMargin: { type: Number, default: 0 },
    retailerDiscount: { type: Number, default: 0 },
    retailerPrice: { type: Number, default: 0 },
    retailerMargin: { type: Number, default: 0 },
    wholesalerDiscount: { type: Number, default: 0 },
    wholesalerPrice: { type: Number, default: 0 },
    wholesalerMargin: { type: Number, default: 0 },
    minimumQty: { type: Number, default: 0 },
    openingQty: { type: Number, default: 0 },

    onlinePrice: { type: Number, default: 0 },
    additionalInfo: { type: String },

    barcode: { type: String, index: true, sparse: true },
    barcodeType: { type: String, enum: Object.values(BARCODE_TYPE) },
    variants: { type: [variantSchema], default: [] },
    isFavorite: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const productModel = mongoose.model<IProduct>("product", productSchema);
