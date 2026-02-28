import mongoose, { Schema } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  transactionSummarySchema,
} from "./base";
import { IPurchaseOrder } from "../../types";
import { ORDER_STATUS, TAX_TYPE } from "../../common";

// Shared Item Schema for Purchase Documents
export const purchaseItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    qty: { type: Number, required: true },
    uomId: { type: Schema.Types.ObjectId, ref: "product" },
    unitCost: { type: Number },
    tax: { type: String },
    landingCost: { type: String },
    margin: { type: String },
    total: { type: Number },
  },
  { _id: false },
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    ...baseSchemaFields,
    supplierId: { type: Schema.Types.ObjectId, ref: "contact", required: true },
    orderDate: { type: Date, required: true },
    orderNo: { type: String },
    placeOfSupply: { type: String },
    billingAddress: { type: Schema.Types.ObjectId },
    shippingDate: { type: Date },
    shippingNote: { type: String },
    taxType: { type: String, enum: Object.values(TAX_TYPE) },
    items: [purchaseItemSchema],

    termsAndConditionIds: [
      { type: Schema.Types.ObjectId, ref: "terms-condition" },
    ],
    notes: { type: String },

    totalQty: { type: String },
    totalTax: { type: String },
    total: { type: String },

    summary: transactionSummarySchema,

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.IN_PROGRESS,
    },
  },
  baseSchemaOptions,
);

export const purchaseOrderModel = mongoose.model<IPurchaseOrder>(
  "purchase-order",
  purchaseOrderSchema,
);
