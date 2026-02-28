import mongoose, { Schema } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  commonAdditionalChargeSchema,
  transactionSummarySchema,
} from "./base";
import { PAYMENT_TERMS_ENUM, PURCHASE_DEBIT_NOTE_STATUS } from "../../common";

export interface IpurchaseDebitNote {
  _id?: Schema.Types.ObjectId;
  companyId: Schema.Types.ObjectId;
  branchId?: Schema.Types.ObjectId;
  supplierId: Schema.Types.ObjectId;
  placeOfSupply?: string;
  billingAddress?: Schema.Types.ObjectId;
  shippingAddress?: Schema.Types.ObjectId;
  debitNoteNo: string;
  referenceBillNo?: string;
  debitNoteDate: Date;
  dueDate?: Date;
  shippingDate?: Date;
  paymentTerm?: string;
  purchaseId?: Schema.Types.ObjectId;
  reverseCharge: boolean;
  reason?: string;
  accountLedgerId?: Schema.Types.ObjectId;
  productDetails: {
    items: any[];
    totalQty: number;
    totalTax: number;
    totalAmount: number;
  };
  additionalCharges: {
    items: any[];
    total: number;
  };
  termsAndConditionIds: Schema.Types.ObjectId[];
  summary: any;
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
    uomId: { type: Schema.Types.ObjectId, ref: "uom" },
    unitCost: { type: Number, min: 0 },
    mrp: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 },
    discount1: { type: Number, default: 0, min: 0 },
    discount2: { type: Number, default: 0, min: 0 },
    taxId: { type: Schema.Types.ObjectId, ref: "tax" },
    landingCost: { type: Number, min: 0 },
    margin: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
  },
  { _id: false },
);

const purchaseDebitNoteSchema = new Schema<IpurchaseDebitNote>(
  {
    ...baseSchemaFields,

    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "contact",
    },
    placeOfSupply: { type: String },
    billingAddress: { type: Schema.Types.ObjectId },
    shippingAddress: { type: Schema.Types.ObjectId },
    debitNoteNo: { type: String },
    referenceBillNo: { type: String },
    debitNoteDate: { type: Date },
    dueDate: { type: Date },
    shippingDate: { type: Date },
    paymentTerm: { type: String, enum: Object.values(PAYMENT_TERMS_ENUM) },
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: "purchase-order",
    },
    reverseCharge: { type: Boolean, default: false },
    reason: { type: String },
    accountLedgerId: {
      type: Schema.Types.ObjectId,
      ref: "account-group",
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
    termsAndConditionIds: [
      { type: Schema.Types.ObjectId, ref: "terms-condition" },
    ],
    summary: transactionSummarySchema,
    status: {
      type: String,
      enum: Object.values(PURCHASE_DEBIT_NOTE_STATUS),
      default: PURCHASE_DEBIT_NOTE_STATUS.OPEN,
    },
  },
  baseSchemaOptions,
);

export const purchaseDebitNoteModel = mongoose.model(
  "purchase-debit-note",
  purchaseDebitNoteSchema,
);
