import Joi, { object } from "joi";
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
    .valid(...PRODUCT_TYPE)
    .default(PRODUCT_TYPE[0])
    .optional(),

  uomId: objectId().required(),

  mrp: Joi.number().min(0).default(0).optional(),
  sellingPrice: Joi.number().min(0).default(0).optional(),
  purchasePrice: Joi.number().min(0).default(0).optional(),
  landingCost: Joi.number().min(0).default(0).optional(),

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
    .valid(...PRODUCT_EXPIRY_TYPE)
    .optional(),

  description: Joi.string().optional(),
  shortDescription: Joi.string().optional(),
  netWeight: Joi.number().optional(),
  nutritionInfo: Joi.string().optional(),
  ingredients: Joi.string().optional(),
  image: Joi.string().optional(),

  status: Joi.string()
    .valid(...PRODUCT_STATUS)
    .default(PRODUCT_STATUS[0])
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
    .valid(...PRODUCT_TYPE)
    .optional(),

  uomId: objectId().optional(),

  mrp: Joi.number().min(0),
  sellingPrice: Joi.number().min(0).optional(),
  purchasePrice: Joi.number().min(0).optional(),
  landingCost: Joi.number().min(0).optional(),

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
    .valid(...PRODUCT_EXPIRY_TYPE)
    .optional(),

  description: Joi.string().optional(),
  shortDescription: Joi.string().optional(),
  netWeight: Joi.number().optional(),
  nutritionInfo: Joi.string().optional(),
  ingredients: Joi.string().optional(),
  image: Joi.string().optional(),

  status: Joi.string()
    .valid(...PRODUCT_STATUS)
    .optional(),

  ...baseApiSchema,
});

export const deleteProductSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getProductSchema = Joi.object().keys({
  id: objectId().required(),
});
