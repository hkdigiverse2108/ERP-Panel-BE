import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { VALUE_TYPE, DISCOUNT_STATUS, DISCOUNT_MODE, DISCOUNT_APPLICABLE, DISCOUNT_APPLIES_TO, MINIMUM_REQUIREMENT } from "../common";

// --- Sub-schemas ---

const rangeWiseRuleJoi = Joi.object({
  minQty: Joi.number().min(0).required(),
  maxQty: Joi.number().min(Joi.ref("minQty")).required(),
  discountType: Joi.string()
    .valid(...Object.values(VALUE_TYPE))
    .required(),
  discountValue: Joi.number().min(0).required(),
});

const buyXGetYJoi = Joi.object({
  buyQty: Joi.number().integer().min(1).required(),
  getQty: Joi.number().integer().min(1).required(),
  getProductIds: Joi.array().items(objectId()).optional(),
  getDiscountType: Joi.string()
    .valid(...Object.values(VALUE_TYPE))
    .optional()
    .default(VALUE_TYPE.PERCENTAGE),
  getDiscountValue: Joi.number().min(0).optional().default(100),
});

const productAtFixAmountJoi = Joi.object({
  minimumAmount: Joi.number().min(0).required(),
  freeProductIds: Joi.array().items(objectId()).min(1).required(),
  freeQty: Joi.number().integer().min(1).default(1),
});

// --- Add Discount ---

export const addDiscountSchema = Joi.object().keys({
  // Core
  title: Joi.string().required(),
  discountCode: Joi.string().allow(null, "").optional(),

  // Behaviour
  autoApply: Joi.boolean().default(false),
  excludeAlreadyDiscounted: Joi.boolean().default(true),
  discountApplicable: Joi.string()
    .valid(...Object.values(DISCOUNT_APPLICABLE))
    .default(DISCOUNT_APPLICABLE.PRODUCT_WISE),

  // Discount Mode
  discountMode: Joi.string()
    .valid(...Object.values(DISCOUNT_MODE))
    .default(DISCOUNT_MODE.NORMAL),
  discountType: Joi.when("discountMode", {
    is: DISCOUNT_MODE.NORMAL,
    then: Joi.string()
      .valid(...Object.values(VALUE_TYPE))
      .default(VALUE_TYPE.PERCENTAGE),
    otherwise: Joi.string()
      .valid(...Object.values(VALUE_TYPE))
      .optional()
      .allow(null),
  }),
  discountValue: Joi.when("discountMode", {
    is: DISCOUNT_MODE.NORMAL,
    then: Joi.number().min(0).required(),
    otherwise: Joi.number().min(0).optional().allow(null),
  }),
  rangeWiseRules: Joi.when("discountMode", {
    is: DISCOUNT_MODE.RANGE_WISE,
    then: Joi.array().items(rangeWiseRuleJoi).min(1).required(),
    otherwise: Joi.array().items(rangeWiseRuleJoi).optional(),
  }),
  buyXGetY: Joi.when("discountMode", {
    is: DISCOUNT_MODE.BUY_X_GET_Y,
    then: buyXGetYJoi.required(),
    otherwise: buyXGetYJoi.optional().allow(null),
  }),
  productAtFixAmount: Joi.when("discountMode", {
    is: DISCOUNT_MODE.PRODUCT_AT_FIX_AMOUNT,
    then: productAtFixAmountJoi.required(),
    otherwise: productAtFixAmountJoi.optional().allow(null),
  }),

  // Targeting
  appliesTo: Joi.string()
    .valid(...Object.values(DISCOUNT_APPLIES_TO))
    .allow(null, "")
    .optional(),
  applyToEntireSelection: Joi.boolean().default(false),
  categoryIds: Joi.when("appliesTo", {
    is: DISCOUNT_APPLIES_TO.SPECIFIC_CATEGORY,
    then: Joi.array().items(objectId()).min(1).required(),
    otherwise: Joi.array().items(objectId()).optional(),
  }),
  subcategoryIds: Joi.array().items(objectId()).optional(),
  brandIds: Joi.when("appliesTo", {
    is: DISCOUNT_APPLIES_TO.SPECIFIC_BRAND,
    then: Joi.array().items(objectId()).min(1).required(),
    otherwise: Joi.array().items(objectId()).optional(),
  }),
  productIds: Joi.when("appliesTo", {
    is: DISCOUNT_APPLIES_TO.SPECIFIC_PRODUCTS,
    then: Joi.array().items(objectId()).min(1).required(),
    otherwise: Joi.array().items(objectId()).optional(),
  }),
  excludedProductIds: Joi.array().items(objectId()).optional(),

  // Minimum Requirements
  minimumRequirement: Joi.string()
    .valid(...Object.values(MINIMUM_REQUIREMENT))
    .default(MINIMUM_REQUIREMENT.NONE),
  minimumPurchaseAmount: Joi.when("minimumRequirement", {
    is: MINIMUM_REQUIREMENT.MIN_PURCHASE_AMOUNT,
    then: Joi.number().min(0).required(),
    otherwise: Joi.number().optional().allow(null),
  }),
  minimumQuantity: Joi.when("minimumRequirement", {
    is: MINIMUM_REQUIREMENT.MIN_QUANTITY,
    then: Joi.number().integer().min(1).required(),
    otherwise: Joi.number().optional().allow(null),
  }),

  // Usage Limits
  usageLimitTotal: Joi.number().integer().min(1).optional().allow(null),
  usageLimitPerCustomer: Joi.boolean().default(false),

  // Active Dates
  startDateTime: Joi.date().required(),
  hasEndDate: Joi.boolean().default(false),
  endDateTime: Joi.when("hasEndDate", {
    is: true,
    then: Joi.date().required(),
    otherwise: Joi.date().optional().allow(null),
  }),

  // Branch Scoping
  branchIds: Joi.array().items(objectId()).optional(),

  // Status
  status: Joi.string()
    .valid(...Object.values(DISCOUNT_STATUS))
    .default(DISCOUNT_STATUS.ACTIVE)
    .optional(),
  ...baseApiSchema,
});

// --- Edit Discount ---

export const editDiscountSchema = Joi.object().keys({
  discountId: objectId().required(),

  // All fields optional on edit
  title: Joi.string().optional(),
  discountCode: Joi.string().allow(null, "").optional(),

  autoApply: Joi.boolean().optional(),
  excludeAlreadyDiscounted: Joi.boolean().optional(),
  discountApplicable: Joi.string()
    .valid(...Object.values(DISCOUNT_APPLICABLE))
    .optional(),

  discountMode: Joi.string()
    .valid(...Object.values(DISCOUNT_MODE))
    .optional(),
  discountType: Joi.string()
    .valid(...Object.values(VALUE_TYPE))
    .optional()
    .allow(null),
  discountValue: Joi.number().min(0).optional().allow(null),
  rangeWiseRules: Joi.array().items(rangeWiseRuleJoi).optional(),
  buyXGetY: buyXGetYJoi.optional().allow(null),
  productAtFixAmount: productAtFixAmountJoi.optional().allow(null),

  appliesTo: Joi.string()
    .valid(...Object.values(DISCOUNT_APPLIES_TO))
    .allow(null, "")
    .optional(),
  applyToEntireSelection: Joi.boolean().optional(),
  categoryIds: Joi.array().items(objectId()).optional(),
  subcategoryIds: Joi.array().items(objectId()).optional(),
  brandIds: Joi.array().items(objectId()).optional(),
  productIds: Joi.array().items(objectId()).optional(),
  excludedProductIds: Joi.array().items(objectId()).optional(),

  minimumRequirement: Joi.string()
    .valid(...Object.values(MINIMUM_REQUIREMENT))
    .optional(),
  minimumPurchaseAmount: Joi.number().min(0).optional().allow(null),
  minimumQuantity: Joi.number().integer().min(1).optional().allow(null),

  usageLimitTotal: Joi.number().integer().min(1).optional().allow(null),
  usageLimitPerCustomer: Joi.boolean().optional(),

  startDateTime: Joi.date().optional(),
  hasEndDate: Joi.boolean().optional(),
  endDateTime: Joi.date().optional().allow(null),

  branchIds: Joi.array().items(objectId()).optional(),

  status: Joi.string()
    .valid(...Object.values(DISCOUNT_STATUS))
    .optional(),
  ...baseApiSchema,
});

// --- Delete / Get ---

export const deleteDiscountSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getDiscountSchema = Joi.object().keys({
  id: objectId().required(),
});

const orderItemJoi = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().min(1).required(),
  mrp: Joi.number().min(0).required(),
  unitCost: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).default(0),
}).unknown(true);

export const verifyDiscountSchema = Joi.object()
  .keys({
    discountId: objectId().optional(),
    discountCode: Joi.string().optional(),
    branchId: objectId().optional(),
    customerId: objectId().optional().allow(null),
    items: Joi.array().items(orderItemJoi).min(1).required(),
    totalAmount: Joi.number().min(0).required(),
    totalQty: Joi.number().min(0).optional().default(0),
  })
  .or("discountId", "discountCode");

// --- Apply Discount (verify + increment usage) ---

export const applyDiscountSchema = Joi.object()
  .keys({
    discountId: objectId().optional(),
    discountCode: Joi.string().optional(),
    branchId: objectId().optional(),
    customerId: objectId().optional().allow(null),
    items: Joi.array().items(orderItemJoi).min(1).required(),
    totalAmount: Joi.number().min(0).required(),
    totalQty: Joi.number().min(0).optional().default(0),
  })
  .or("discountId", "discountCode");

// --- Remove Discount (revert usage) ---

export const removeDiscountSchema = Joi.object().keys({
  discountId: objectId().required(),
  customerId: objectId().optional().allow(null),
});
