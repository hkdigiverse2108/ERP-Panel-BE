import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IPurchaseOrder } from "../../types";
import { ORDER_STATUS, TAX_TYPE } from "../../common";

// Shared Item Schema for Purchase Documents
export const purchaseItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    qty: { type: Number, required: true },
    uom: { type: String },
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
    shippingDate: { type: Date },
    shippingNote: { type: String },
    taxType: { type: String, enum: Object.values(TAX_TYPE) },
    // documentNo: { type: String, required: true, index: true },
    // supplyDate: { type: Date },
    // supplierName: { type: String },
    items: [purchaseItemSchema],

    finalQty: { type: String },
    finalTax: { type: String },
    finalTotal: { type: String },

    flatDiscount: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },

    notes: { type: String },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.IN_PROGRESS },
  },
  baseSchemaOptions,
);

export const purchaseOrderModel = mongoose.model<IPurchaseOrder>("purchase-order", purchaseOrderSchema);
