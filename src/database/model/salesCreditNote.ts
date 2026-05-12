import mongoose, { Schema } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  transactionSummarySchema,
  commonAdditionalChargeSchema,
  salesItemSchema,
  commonShippingSchema,
} from "./base";
import { IBase } from "../../types";
import {
  PURCHASE_DEBIT_NOTE_STATUS,
  SALES_CREDIT_NOTE_PRODUCT_TYPE,
} from "../../common";

export interface ISalesCreditNote extends IBase {
  customerId: Schema.Types.ObjectId;
  placeOfSupply?: string;
  billingAddress?: Schema.Types.ObjectId;
  shippingAddress?: Schema.Types.ObjectId;

  creditNoteDate: Date;
  creditNoteNo: string;
  dueDate?: Date;

  salesId?: Schema.Types.ObjectId;
  reverseCharge: boolean;
  sez?: string;
  paymentReminder: boolean;
  productType: string;

  salesManId?: Schema.Types.ObjectId;
  reason?: string;
  productDetails: any[];

  additionalCharges: any[];

  termsAndConditionIds: Schema.Types.ObjectId[];
  notes?: string;

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
  paidAmount: number;
  balanceAmount: number;
  status: string;
}

export const salesCreditNoteItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product" },
    uomId: { type: Schema.Types.ObjectId, ref: "uom" },
    unit: { type: String },
    qty: { type: Number, min: 0 },
    freeQty: { type: Number, min: 0, default: 0 },

    price: { type: Number, min: 0 },
    discount1: { type: Number, default: 0, min: 0 },
    discount2: { type: Number, default: 0, min: 0 },

    taxId: { type: Schema.Types.ObjectId, ref: "tax" },
    tax: { type: Number },
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
      ref: "invoice",
    },

    reason: { type: String },

    reverseCharge: { type: Boolean, default: false },
    sez: { type: String },
    paymentReminder: { type: Boolean, default: false },
    productType: {
      type: String,
      enum: Object.values(SALES_CREDIT_NOTE_PRODUCT_TYPE),
      default: SALES_CREDIT_NOTE_PRODUCT_TYPE.ALL,
    },

    salesManId: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },

    productDetails: [salesCreditNoteItemSchema],

    additionalCharges: [commonAdditionalChargeSchema],

    termsAndConditionIds: [
      { type: Schema.Types.ObjectId, ref: "terms-condition" },
    ],
    notes: { type: String },

    shippingDetails: commonShippingSchema,

    summary: transactionSummarySchema,
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },

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
