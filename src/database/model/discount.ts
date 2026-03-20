import mongoose, { Schema } from "mongoose";
import { DISCOUNT_STATUS, VALUE_TYPE, DISCOUNT_MODE, DISCOUNT_APPLICABLE, DISCOUNT_APPLIES_TO, MINIMUM_REQUIREMENT } from "../../common";
import { IDiscount } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

// Sub-schema: Range Wise Rules
const rangeWiseRuleSchema = new Schema(
  {
    minQty: { type: Number, required: true },
    maxQty: { type: Number, required: true },
    discountType: { type: String, enum: Object.values(VALUE_TYPE), required: true },
    discountValue: { type: Number, required: true },
  },
  { _id: false },
);

// Sub-schema: Buy X Get Y
const buyXGetYSchema = new Schema(
  {
    buyQty: { type: Number, required: true },
    getQty: { type: Number, required: true },
    getProductIds: [{ type: Schema.Types.ObjectId, ref: "product" }],
    getDiscountType: { type: String, enum: Object.values(VALUE_TYPE), required: true },
    getDiscountValue: { type: Number, required: true },
  },
  { _id: false },
);

// Sub-schema: Product at Fix Amount
const productAtFixAmountSchema = new Schema(
  {
    minimumAmount: { type: Number, required: true },
    freeProductIds: [{ type: Schema.Types.ObjectId, ref: "product" }],
    freeQty: { type: Number, required: true, default: 1 },
  },
  { _id: false },
);

const discountSchema = new Schema<IDiscount>(
  {
    ...baseSchemaFields,

    // Core
    title: { type: String, required: true },
    discountCode: { type: String, default: null },

    // Behaviour
    autoApply: { type: Boolean, default: false },
    excludeAlreadyDiscounted: { type: Boolean, default: true },
    discountApplicable: {
      type: String,
      enum: Object.values(DISCOUNT_APPLICABLE),
      default: DISCOUNT_APPLICABLE.PRODUCT_WISE,
    },

    // Discount Mode
    discountMode: {
      type: String,
      enum: Object.values(DISCOUNT_MODE),
      default: DISCOUNT_MODE.NORMAL,
    },
    discountType: {
      type: String,
      enum: Object.values(VALUE_TYPE),
      default: VALUE_TYPE.PERCENTAGE,
    },
    discountValue: { type: Number, default: 0 },
    rangeWiseRules: [rangeWiseRuleSchema],
    buyXGetY: { type: buyXGetYSchema, default: null },
    productAtFixAmount: { type: productAtFixAmountSchema, default: null },

    // Targeting — Applies To
    appliesTo: {
      type: String,
      enum: Object.values(DISCOUNT_APPLIES_TO),
    },
    applyToEntireSelection: { type: Boolean, default: false },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "category" }],
    subcategoryIds: [{ type: Schema.Types.ObjectId, ref: "category" }],
    brandIds: [{ type: Schema.Types.ObjectId, ref: "brand" }],
    productIds: [{ type: Schema.Types.ObjectId, ref: "product" }],
    excludedProductIds: [{ type: Schema.Types.ObjectId, ref: "product" }],

    // Minimum Requirements
    minimumRequirement: {
      type: String,
      enum: Object.values(MINIMUM_REQUIREMENT),
      default: MINIMUM_REQUIREMENT.NONE,
    },
    minimumPurchaseAmount: { type: Number, default: null },
    minimumQuantity: { type: Number, default: null },

    // Usage Limits
    usageLimitTotal: { type: Number, default: null },
    usageLimitPerCustomer: { type: Boolean, default: false },
    usedCount: { type: Number, default: 0 },

    // Active Dates
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, default: null },
    hasEndDate: { type: Boolean, default: false },

    // Branch Scoping
    branchIds: [{ type: Schema.Types.ObjectId, ref: "branch" }],

    // Status
    status: {
      type: String,
      enum: Object.values(DISCOUNT_STATUS),
      default: DISCOUNT_STATUS.ACTIVE,
    },
  },
  baseSchemaOptions,
);

// Indexes
discountSchema.index({ discountCode: 1 }, { unique: true, sparse: true });
discountSchema.index({ branchIds: 1 });
discountSchema.index({ startDateTime: 1, endDateTime: 1 });

export const discountModel = mongoose.model<IDiscount>("discount", discountSchema);
