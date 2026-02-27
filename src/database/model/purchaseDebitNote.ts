import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions, commonAdditionalChargeSchema, transactionSummarySchema } from "./base";
import { PAYMENT_TERMS_ENUM } from "../../common";

export interface IpurchaseDebitNote {
  _id?: Schema.Types.ObjectId;
  documentNo: string;
  date: Date;
  customerId: Schema.Types.ObjectId;
  customerName?: string;
  invoiceId?: Schema.Types.ObjectId;
  items: any[];
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  roundOff: number;
  netAmount: number;
  reason?: string;
  status: string;
  isDeleted: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

export const purchaseDebitNoteItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product" },
    batchId: { type: Schema.Types.ObjectId, ref: "batch" },
    unit: { type: String },
    unitCost: { type: Number, min: 0 },
    mrp: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 },
    discount1: { type: Number, default: 0, min: 0 },
    discount2: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    landingCost: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
  },
  { _id: false },
);

const purchaseDebitNoteSchema = new Schema(
  {
    ...baseSchemaFields,

    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "contact",
    },
    debitNoteNo: { type: String },
    referenceBillNo: { type: String },
    debitNoteDate: { type: Date },
    dueDate: { type: Date },
    shippingDate: { type: Date },
    paymentTerm: { type: String, enum: Object.values(PAYMENT_TERMS_ENUM) },
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: "purchase",
    },
    reverseCharge: { type: Boolean, default: false },
    reason: { type: String },
    accountLedgerId: {
      type: Schema.Types.ObjectId,
      ref: "account-ledger",
    },
    productDetails: {
      items: [purchaseDebitNoteItemSchema],
      totalQty: { type: Number },
      totalTax: { type: Number },
      totalAmount: { type: Number },
    },
    additionalCharges: {
      items: [commonAdditionalChargeSchema],
      total: { type: Number },
    },
    termsAndConditionIds: [{ type: Schema.Types.ObjectId, ref: "terms-condition" }],
    notes: { type: String },
    summary: transactionSummarySchema,
  },
  baseSchemaOptions,
);

export const purchaseDebitNoteModel = mongoose.model("purchase-debit-note", purchaseDebitNoteSchema);
