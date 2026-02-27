import mongoose, { Schema } from "mongoose";
import { SUPPLIER_BILL_STATUS, SUPPLIER_PAYMENT_STATUS, PAYMENT_TERMS_ENUM } from "../../common";
import { baseSchemaFields, baseSchemaOptions, commonAdditionalChargeSchema, transactionSummarySchema } from "./base";
import { ISupplierBill } from "../../types";

export const supplierBillItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    qty: { type: Number, min: 0 },
    freeQty: { type: Number, default: 0, min: 0 },
    mrp: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 },
    unitCost: { type: Number, min: 0 },
    discount1: { type: Number, default: 0, min: 0 },
    discount2: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, min: 0 },
    landingCost: { type: Number, min: 0 },
    margin: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
  },
  { _id: false },
);

export const supplierBillReturnItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    qty: { type: Number, min: 0 },
    discount1: { type: Number, default: 0, min: 0 },
    discount2: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    landingCost: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
  },
  { _id: false },
);

const supplierBillSchema = new Schema<ISupplierBill>(
  {
    ...baseSchemaFields,

    supplierId: { type: Schema.Types.ObjectId, ref: "contact", required: true },

    supplierBillNo: { type: String },
    referenceBillNo: { type: String },
    supplierBillDate: { type: Date },

    // purchaseOrderId: { type: Schema.Types.ObjectId, ref: "purchase-order" },

    paymentTerm: { type: String, enum: Object.values(PAYMENT_TERMS_ENUM) },
    dueDate: { type: Date },

    reverseCharge: { type: Boolean, default: false },
    shippingDate: { type: Date },

    taxType: { type: String },
    invoiceAmount: { type: String },

    productDetails: {
      item: [supplierBillItemSchema],
      totalQty: { type: Number },
      totalTax: { type: Number },
      total: { type: Number },
    },

    returnProductDetails: {
      item: [supplierBillReturnItemSchema],
      totalQty: { type: Number },
      total: { type: Number },
      summary: {
        grossAmount: Number,
        taxAmount: Number,
        roundOff: Number,
        netAmount: Number,
      },
    },

    additionalCharges: {
      item: [commonAdditionalChargeSchema],
      total: { type: Number },
    },

    termsAndConditionIds: [{ type: Schema.Types.ObjectId, ref: "terms-condition" }],
    notes: { type: String },

    summary: transactionSummarySchema,

    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: Object.values(SUPPLIER_PAYMENT_STATUS),
      default: SUPPLIER_PAYMENT_STATUS.UNPAID,
    },

    status: {
      type: String,
      enum: Object.values(SUPPLIER_BILL_STATUS),
      default: SUPPLIER_BILL_STATUS.ACTIVE,
    },
  },
  baseSchemaOptions,
);

export const supplierBillModel = mongoose.model<ISupplierBill>("supplier-bill", supplierBillSchema);
