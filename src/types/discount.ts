import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IRangeWiseRule {
  minQty: number;
  maxQty: number;
  discountType: "percentage" | "flat";
  discountValue: number;
}

export interface IBuyXGetY {
  buyQty: number;
  getQty: number;
  getProductIds?: Schema.Types.ObjectId[];
  getDiscountType: "percentage" | "flat";
  getDiscountValue: number;
}

export interface IFixedPriceProduct {
  productId: Schema.Types.ObjectId;
  fixedPrice: number;
}

export interface IDiscount extends IBase {
  // Core
  title: string;
  discountCode?: string;

  // Behaviour
  autoApply: boolean;
  excludeAlreadyDiscounted: boolean;
  discountApplicable: "product_wise" | "entire_bill";

  // Discount Mode
  discountMode: "normal" | "range_wise" | "buy_x_get_y" | "product_at_fix_amount";
  discountType?: "percentage" | "flat";
  discountValue?: number;
  rangeWiseRules?: IRangeWiseRule[];
  buyXGetY?: IBuyXGetY;
  fixedPriceProducts?: IFixedPriceProduct[];

  // Targeting
  appliesTo: "specific_category" | "specific_brand" | "specific_products";
  applyToEntireSelection: boolean;
  categoryIds?: Schema.Types.ObjectId[];
  subcategoryIds?: Schema.Types.ObjectId[];
  brandIds?: Schema.Types.ObjectId[];
  productIds?: Schema.Types.ObjectId[];
  excludedProductIds?: Schema.Types.ObjectId[];

  // Minimum Requirements
  minimumRequirement: "none" | "min_purchase_amount" | "min_quantity";
  minimumPurchaseAmount?: number;
  minimumQuantity?: number;

  // Usage Limits
  usageLimitTotal?: number | null;
  usageLimitPerCustomer: boolean;
  usedCount: number;

  // Active Dates
  startDate: Date;
  startTime?: string;
  endDate?: Date | null;
  endTime?: string;
  hasEndDate: boolean;

  // Branches
  branchIds?: Schema.Types.ObjectId[];

  // Status
  status: "active" | "inactive";
}