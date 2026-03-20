import Joi from "joi";
import { PRODUCT_EXPIRY_TYPE, PRODUCT_TYPE } from "../common";
import { objectId } from "./common";

export const addProductSchema = Joi.object().keys({
  name: Joi.string().required(),
  printName: Joi.string().optional(),

  categoryId: objectId().optional(),
  subCategoryId: objectId().optional(),
  brandId: objectId().optional(),
  subBrandId: objectId().optional(),
  productTypeId: objectId().optional(),

  productType: Joi.string()
    .valid(...Object.values(PRODUCT_TYPE))
    .default(PRODUCT_TYPE.FINISHED)
    .optional(),

  purchasePrice: Joi.number().min(0).default(0).optional(),
  landingCost: Joi.number().min(0).default(0).optional(),
  mrp: Joi.number().min(0).default(0).optional(),
  sellingPrice: Joi.number().min(0).default(0).optional(),
  sellingDiscount: Joi.number().min(0).default(0).optional(),
  sellingMargin: Joi.number().min(0).default(0).optional(),
  retailerDiscount: Joi.number().min(0).default(0).optional(),
  retailerPrice: Joi.number().min(0).default(0).optional(),
  retailerMargin: Joi.number().min(0).default(0).optional(),
  wholesalerDiscount: Joi.number().min(0).default(0).optional(),
  wholesalerPrice: Joi.number().min(0).default(0).optional(),
  wholesalerMargin: Joi.number().min(0).default(0).optional(),
  onlinePrice: Joi.number().min(0).default(0).optional(),
  minimumQty: Joi.number().min(0).default(0).optional(),
  openingQty: Joi.number().min(0).default(0).optional(),
  masterQty: Joi.number().min(0).default(0).optional().allow("", null),

  hsnCode: Joi.string().optional(),
  sku: Joi.string().optional(),
  // purchaseTaxId: objectId().optional(),
  // salesTaxId: objectId().optional(),
  // isPurchaseTaxIncluding: Joi.boolean().default(false).optional(),
  // isSalesTaxIncluding: Joi.boolean().default(false).optional(),
  cessPercentage: Joi.number().min(0).default(0).optional().allow("", null),

  manageMultipleBatch: Joi.boolean().default(false).optional(),
  isExpiryProductSaleable: Joi.boolean().default(true).optional(),
  hasExpiry: Joi.boolean().default(false).optional(),

  expiryDays: Joi.number().min(0).when("hasExpiry", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  calculateExpiryOn: Joi.string()
    .valid(...Object.values(PRODUCT_EXPIRY_TYPE))
    .when("hasExpiry", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  expiryReferenceDate: Joi.date().when("hasExpiry", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  ingredients: Joi.array().items(Joi.string()).optional(),
  description: Joi.string().optional(),
  shortDescription: Joi.string().optional(),
  netWeight: Joi.number().min(0).optional().allow("", null),

  nutrition: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().optional().allow("", null),
        value: Joi.string().optional().allow("", null),
      }),
    )
    .optional(),

  images: Joi.array().items(Joi.string()).optional().allow("", null),

  additionalInfo: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().optional(),

  // ...baseApiSchema,
});

export const editProductSchema = Joi.object().keys({
  productId: objectId().required(),

  itemCode: Joi.string().optional(),
  name: Joi.string().optional(),
  printName: Joi.string().optional(),

  categoryId: objectId().optional(),
  subCategoryId: objectId().optional(),
  brandId: objectId().optional(),
  subBrandId: objectId().optional(),
  productTypeId: objectId().optional(),

  productType: Joi.string()
    .valid(...Object.values(PRODUCT_TYPE))
    .optional(),

  purchasePrice: Joi.number().min(0).optional(),
  landingCost: Joi.number().min(0).optional(),
  mrp: Joi.number().min(0).optional(),
  sellingPrice: Joi.number().min(0).optional(),
  sellingDiscount: Joi.number().min(0).optional(),
  sellingMargin: Joi.number().min(0).optional(),

  retailerDiscount: Joi.number().min(0).optional(),
  retailerPrice: Joi.number().min(0).optional(),
  retailerMargin: Joi.number().min(0).optional(),

  wholesalerDiscount: Joi.number().min(0).optional(),
  wholesalerPrice: Joi.number().min(0).optional(),
  wholesalerMargin: Joi.number().min(0).optional(),

  onlinePrice: Joi.number().min(0).optional(),

  minimumQty: Joi.number().min(0).optional(),
  openingQty: Joi.number().min(0).optional(),
  masterQty: Joi.number().min(0).optional().allow("", null),

  hsnCode: Joi.string().optional(),
  sku: Joi.string().optional(),
  // purchaseTaxId: objectId().optional(),
  // salesTaxId: objectId().optional(),
  // isPurchaseTaxIncluding: Joi.boolean().optional(),
  // isSalesTaxIncluding: Joi.boolean().optional(),
  cessPercentage: Joi.number().min(0).optional().allow("", null),

  manageMultipleBatch: Joi.boolean().optional(),
  isExpiryProductSaleable: Joi.boolean().optional(),
  hasExpiry: Joi.boolean().optional(),

  expiryDays: Joi.number().min(0).optional(),

  calculateExpiryOn: Joi.string()
    .valid(...Object.values(PRODUCT_EXPIRY_TYPE))
    .optional(),

  expiryReferenceDate: Joi.date().optional(),

  ingredients: Joi.array().items(Joi.string()).optional(),
  description: Joi.string().optional(),
  shortDescription: Joi.string().optional(),
  netWeight: Joi.number().min(0).optional().allow("", null),

  nutrition: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
      }),
    )
    .optional(),

  images: Joi.array().items(Joi.string()).optional().allow("", null),

  additionalInfo: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().optional(),
});

export const addBulkProductSchema = Joi.object().keys({
  name: Joi.string().required(),
  printName: Joi.string().optional(),

  category: Joi.string().optional(),
  subCategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  subBrand: Joi.string().optional(),
  // productType: objectId().optional(),
  // categoryId: objectId().optional(),
  // subCategoryId: objectId().optional(),
  // brandId: objectId().optional(),
  // subBrandId: objectId().optional(),
  // productTypeId: objectId().optional(),

  productType: Joi.string()
    .valid(...Object.values(PRODUCT_TYPE))
    .default(PRODUCT_TYPE.FINISHED)
    .optional(),

  masterQty: Joi.number().min(0).default(0).optional().allow("", null),

  sku: Joi.string().optional(),
  cessPercentage: Joi.number().min(0).default(0).optional().allow("", null),

  manageMultipleBatch: Joi.boolean().default(false).optional(),
  isExpiryProductSaleable: Joi.boolean().default(true).optional(),
  hasExpiry: Joi.boolean().default(false).optional(),

  expiryDays: Joi.number().min(0).when("hasExpiry", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  calculateExpiryOn: Joi.string()
    .valid(...Object.values(PRODUCT_EXPIRY_TYPE))
    .when("hasExpiry", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  expiryReferenceDate: Joi.date().when("hasExpiry", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  ingredients: Joi.array().items(Joi.string()).optional(),
  description: Joi.string().optional(),
  shortDescription: Joi.string().optional(),
  netWeight: Joi.number().min(0).optional().allow("", null),

  nutrition: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().optional().allow("", null),
        value: Joi.string().optional().allow("", null),
      }),
    )
    .optional(),

  isActive: Joi.boolean().optional(),

  // purchasePrice: Joi.number().min(0).default(0).optional(),
  // landingCost: Joi.number().min(0).default(0).optional(),
  // mrp: Joi.number().min(0).default(0).optional(),
  // sellingPrice: Joi.number().min(0).default(0).optional(),
  // sellingDiscount: Joi.number().min(0).default(0).optional(),
  // sellingMargin: Joi.number().min(0).default(0).optional(),
  // retailerDiscount: Joi.number().min(0).default(0).optional(),
  // retailerPrice: Joi.number().min(0).default(0).optional(),
  // retailerMargin: Joi.number().min(0).default(0).optional(),
  // wholesalerDiscount: Joi.number().min(0).default(0).optional(),
  // wholesalerPrice: Joi.number().min(0).default(0).optional(),
  // wholesalerMargin: Joi.number().min(0).default(0).optional(),
  // onlinePrice: Joi.number().min(0).default(0).optional(),
  // minimumQty: Joi.number().min(0).default(0).optional(),
  // openingQty: Joi.number().min(0).default(0).optional(),
  // hsnCode: Joi.string().optional(),
  // purchaseTaxId: objectId().optional(),
  // salesTaxId: objectId().optional(),
  // isPurchaseTaxIncluding: Joi.boolean().default(false).optional(),
  // isSalesTaxIncluding: Joi.boolean().default(false).optional(),
  // images: Joi.array().items(Joi.string()).optional().allow("", null),

  // additionalInfo: Joi.string().optional().allow("", null),
  // ...baseApiSchema,
});

export const deleteProductSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getProductSchema = Joi.object().keys({
  id: objectId().required(),
});
