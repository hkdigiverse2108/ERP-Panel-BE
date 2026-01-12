import mongoose, { Schema } from "mongoose";
import { PRODUCT_EXPIRY_TYPE, PRODUCT_TYPE } from "../../common";
import { IProduct } from "../../types/product";
import { baseCommonFields, baseSchemaOptions } from "./base";

const productSchema = new Schema<IProduct>(
  {
    ...baseCommonFields,
    images: [{ type: String }],
    itemCode: { type: String, index: true },
    productType: { type: String, enum: Object.values(PRODUCT_TYPE), default: PRODUCT_TYPE.FINISHED },

    name: { type: String, required: true, index: true },
    printName: { type: String },

    categoryId: { type: Schema.Types.ObjectId, ref: "category" },
    subCategoryId: { type: Schema.Types.ObjectId, ref: "category" },
    brandId: { type: Schema.Types.ObjectId, ref: "brand" },
    subBrandId: { type: Schema.Types.ObjectId, ref: "brand" },

    uomId: { type: Schema.Types.ObjectId, ref: "uom", required: true },
    hsnCode: { type: String },

    purchaseTaxId: { type: Schema.Types.ObjectId, ref: "tax" },
    salesTaxId: { type: Schema.Types.ObjectId, ref: "tax" },

    isPurchaseTaxIncluding: { type: Boolean, default: false },
    isSalesTaxIncluding: { type: Boolean, default: false },

    cessPercentage: { type: Number, default: 0 },
    
    manageMultipleBatch: { type: Boolean, default: false },
    isExpiryProductSaleable: { type: Boolean, default: true },
    hasExpiry: { type: Boolean, default: false },
    
    expiryDays: { type: Number },
    calculateExpiryOn: { type: String, enum: PRODUCT_EXPIRY_TYPE },
    expiryReferenceDate: { type: Date },
    calculatedExpiryDate: { type: Date },
    
    ingredients: { type: String },
    description: { type: String },
    shortDescription: { type: String },

    netWeight: { type: Number },
    nutrition: [{ name: String, value: String }],
    
    masterQty: { type: Number, default: 0 },
    
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
  },
  baseSchemaOptions
);

export const productModel = mongoose.model<IProduct>("product", productSchema);
