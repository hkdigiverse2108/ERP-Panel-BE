import Joi from "joi";
import { PRODUCT_EXPIRY_TYPE, PRODUCT_STATUS, PRODUCT_TYPE } from "../common";
import { baseApiSchema, objectId } from "./common";

export const addProductSchema = Joi.object().keys({
  itemCode: Joi.string().required(),
  name: Joi.string().required(),
  printName: Joi.string().optional(),
  slug: Joi.string().optional(),

  categoryId: objectId().required(),
  subCategoryId: objectId().optional(),
  brandId: objectId().optional(),
  subBrandId: objectId().optional(),
  departmentId: objectId().optional(),

  productType: Joi.string()
    .valid(...Object.values(PRODUCT_TYPE))
    .default(PRODUCT_TYPE.FINISHED)
    .optional(),

  uomId: objectId().required(),

  mrp: Joi.number().min(0).default(0).optional(),
  sellingPrice: Joi.number().min(0).default(0).optional().default(0),
  purchasePrice: Joi.number().min(0).default(0).optional(),
  landingCost: Joi.number().min(0).default(0).optional(),

  netWeightUnit: Joi.string().optional(),
  masterQty: Joi.number().optional(),
  minimumQty: Joi.number().optional(),
  sellingDiscount: Joi.number().optional(),
  sellingMargin: Joi.number().optional(),
  retailerDiscount: Joi.number().optional(),
  retailerPrice: Joi.number().optional(),
  retailerMargin: Joi.number().optional(),
  wholesalerDiscount: Joi.number().optional(),
  wholesalerPrice: Joi.number().optional(),
  wholesalerMargin: Joi.number().optional(),
  onlinePrice: Joi.number().optional(),
  openingQty: Joi.number().optional(),
  mfgDate: Joi.string().optional().allow("", null),
  isExpiryProductSaleable: Joi.boolean().optional().allow("", null),
  additionalInfo: Joi.string().optional().allow("", null),

  hsnCode: Joi.string().optional(),
  purchaseTaxId: objectId().optional(),
  salesTaxId: objectId().optional(),

  isPurchaseTaxInclusive: Joi.boolean().default(false).optional(),
  isSalesTaxInclusive: Joi.boolean().default(false).optional(),
  cessPercentage: Joi.number().min(0).default(0).optional(),

  manageBatch: Joi.boolean().default(false).optional(),
  hasExpiry: Joi.boolean().default(false).optional(),
  expiryDays: Joi.number().optional(),
  expiryType: Joi.string()
    .valid(...Object.values(PRODUCT_EXPIRY_TYPE))
    .optional(),

  description: Joi.string().optional(),
  shortDescription: Joi.string().optional(),
  netWeight: Joi.number().optional(),
  nutritionInfo: Joi.string().optional(),
  ingredients: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).optional(),

  status: Joi.string()
    .valid(...Object.values(PRODUCT_STATUS))
    .default(PRODUCT_STATUS.ACTIVE)
    .optional(),

  ...baseApiSchema,
});

export const editProductSchema = Joi.object().keys({
  productId: objectId().required(),
  itemCode: Joi.string().optional(),
  name: Joi.string().optional(),
  printName: Joi.string().optional(),
  slug: Joi.string().optional(),

  categoryId: objectId().optional(),
  subCategoryId: objectId().optional(),
  brandId: objectId().optional(),
  subBrandId: objectId().optional(),
  departmentId: objectId().optional(),

  productType: Joi.string()
    .valid(...Object.values(PRODUCT_TYPE))
    .optional(),

  uomId: objectId().optional(),

  mrp: Joi.number().min(0),
  sellingPrice: Joi.number().min(0).optional(),
  purchasePrice: Joi.number().min(0).optional(),
  landingCost: Joi.number().min(0).optional(),

  netWeightUnit: Joi.string().optional().allow("", null),
  masterQty: Joi.number().optional().allow("", null),
  minimumQty: Joi.number().optional().allow("", null),
  sellingDiscount: Joi.number().optional().allow("", null),
  sellingMargin: Joi.number().optional().allow("", null),
  retailerDiscount: Joi.number().optional().allow("", null),
  retailerPrice: Joi.number().optional().allow("", null),
  retailerMargin: Joi.number().optional().allow("", null),
  wholesalerDiscount: Joi.number().optional().allow("", null),
  wholesalerPrice: Joi.number().optional().allow("", null),
  wholesalerMargin: Joi.number().optional().allow("", null),
  onlinePrice: Joi.number().optional().allow("", null),
  openingQty: Joi.number().optional().allow("", null),
  mfgDate: Joi.string().optional().allow("", null),
  isExpiryProductSaleable: Joi.boolean().optional().allow("", null),
  additionalInfo: Joi.string().optional().allow("", null),

  hsnCode: Joi.string().optional(),
  purchaseTaxId: objectId().optional(),
  salesTaxId: objectId().optional(),

  isPurchaseTaxInclusive: Joi.boolean().optional(),
  isSalesTaxInclusive: Joi.boolean().optional(),
  cessPercentage: Joi.number().min(0).optional(),

  manageBatch: Joi.boolean().optional(),
  hasExpiry: Joi.boolean().optional(),
  expiryDays: Joi.number().optional(),
  expiryType: Joi.string()
    .valid(...Object.values(PRODUCT_EXPIRY_TYPE))
    .optional(),

  description: Joi.string().optional(),
  shortDescription: Joi.string().optional(),
  netWeight: Joi.number().optional(),
  nutritionInfo: Joi.string().optional(),
  ingredients: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).optional(),

  status: Joi.string()
    .valid(...Object.values(PRODUCT_STATUS))
    .optional(),

  ...baseApiSchema,
});

export const deleteProductSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getProductSchema = Joi.object().keys({
  id: objectId().required(),
});
