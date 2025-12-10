import Joi from "joi";
import { PRODUCT_EXPIRY_TYPE, PRODUCT_STATUS, PRODUCT_TYPE } from "../common";
import { objectId } from "./common";

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
    .default(PRODUCT_TYPE[0]),

  uomId: objectId().required(),

  mrp: Joi.number().min(0).default(0),
  sellingPrice: Joi.number().min(0).default(0),
  purchasePrice: Joi.number().min(0).default(0),
  landingCost: Joi.number().min(0).default(0),

  hsnCode: Joi.string().optional(),
  purchaseTaxId: Joi.string().optional(),
  salesTaxId: Joi.string().optional(),

  isPurchaseTaxInclusive: Joi.boolean().default(false),
  isSalesTaxInclusive: Joi.boolean().default(false),
  cessPercentage: Joi.number().min(0).default(0),

  manageBatch: Joi.boolean().default(false),
  hasExpiry: Joi.boolean().default(false),
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
    .default(PRODUCT_STATUS[0]),
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
    .default(PRODUCT_TYPE[0]),

  uomId: objectId().optional(),

  mrp: Joi.number().min(0).default(0),
  sellingPrice: Joi.number().min(0).default(0),
  purchasePrice: Joi.number().min(0).default(0),
  landingCost: Joi.number().min(0).default(0),

  hsnCode: Joi.string().optional(),
  purchaseTaxId: Joi.string().optional(),
  salesTaxId: Joi.string().optional(),

  isPurchaseTaxInclusive: Joi.boolean().default(false),
  isSalesTaxInclusive: Joi.boolean().default(false),
  cessPercentage: Joi.number().min(0).default(0),

  manageBatch: Joi.boolean().default(false),
  hasExpiry: Joi.boolean().default(false),
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
    .default(PRODUCT_STATUS[0]),
});
