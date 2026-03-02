import mongoose, { Schema } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  transactionSummarySchema,
  commonAdditionalChargeSchema,
  salesItemSchema,
  commonShippingSchema,
} from "./base";
import { ISalesDocument } from "../../types";
import {
  PURCHASE_DEBIT_NOTE_STATUS,
  SALES_CREDIT_NOTE_PRODUCT_TYPE,
} from "../../common";

export interface ISalesCreditNote extends ISalesDocument {
  customerId: Schema.Types.ObjectId;
  placeOfSupply?: string;
  billingAddress?: Schema.Types.ObjectId;
  shippingAddress?: Schema.Types.ObjectId;

  creditNoteDate: Date;
  creditNoteNo: string;
  dueDate?: Date;

  salesId?: Schema.Types.ObjectId;
  reverseCharge: boolean;
  reason?: string;

  accountLedgerId?: Schema.Types.ObjectId;
  sez?: string;
  paymentReminder: boolean;
  productType: string;

  salesManId?: Schema.Types.ObjectId;

  productDetails: {
    items: any[];
    totalQty: number;
    totalFreeQty: number;
    totalTax: number;
    totalAmount: number;
  };

  additionalCharges: {
    items: any[];
    total: number;
  };

  termsAndConditionIds: Schema.Types.ObjectId[];

  shippingDetails?: {
    shippingType?: string;
    shippingDate?: Date;
    referenceNo?: string;
    transportDate?: Date;
    modeOfTransport?: string;
    transporterId?: Schema.Types.ObjectId;
    vehicleNo?: string;
    weight?: number;
  };

  summary: any;
  status: string;
}

export const salesCreditNoteItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    uomId: { type: Schema.Types.ObjectId, ref: "uom" },

    qty: { type: Number, min: 0, required: true },
    freeQty: { type: Number, min: 0, default: 0 },

    price: { type: Number, min: 0 },
    discount1: { type: Number, default: 0, min: 0 },
    discount2: { type: Number, default: 0, min: 0 },

    taxId: { type: Schema.Types.ObjectId, ref: "tax" },

    total: { type: Number, min: 0 },
  },
  { _id: false },
);

const salesCreditNoteSchema = new Schema<ISalesCreditNote>(
  {
    ...baseSchemaFields,
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "contact",
    },

    placeOfSupply: { type: String },
    billingAddress: { type: Schema.Types.ObjectId },
    shippingAddress: { type: Schema.Types.ObjectId },

    creditNoteDate: { type: Date },
    creditNoteNo: { type: String },
    dueDate: { type: Date },

    salesId: {
      type: Schema.Types.ObjectId,
      ref: "sales",
    },

    reverseCharge: { type: Boolean, default: false },
    reason: { type: String },

    accountLedgerId: {
      type: Schema.Types.ObjectId,
      ref: "account-group",
    },
    sez: { type: String },
    paymentReminder: { type: Boolean, default: false },
    productType: {
      type: String,
      enum: Object.values(SALES_CREDIT_NOTE_PRODUCT_TYPE),
      default: SALES_CREDIT_NOTE_PRODUCT_TYPE.ALL,
    },

    salesManId: {
      type: Schema.Types.ObjectId,
      ref: "employee",
    },

    productDetails: {
      items: [salesCreditNoteItemSchema],
      totalQty: { type: Number, default: 0 },
      totalFreeQty: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
    },

    additionalCharges: {
      items: [commonAdditionalChargeSchema],
      total: { type: Number, default: 0 },
    },

    termsAndConditionIds: [
      { type: Schema.Types.ObjectId, ref: "terms-condition" },
    ],

    shippingDetails: commonShippingSchema,

    summary: transactionSummarySchema,

    status: {
      type: String,
      enum: Object.values(PURCHASE_DEBIT_NOTE_STATUS),
      default: PURCHASE_DEBIT_NOTE_STATUS.OPEN,
    },
  },
  baseSchemaOptions,
);

export const salesCreditNoteModel = mongoose.model<ISalesCreditNote>(
  "sales-credit-note",
  salesCreditNoteSchema,
);
