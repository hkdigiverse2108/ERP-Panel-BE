import mongoose, { Schema } from "mongoose";
import { DISCOUNT_TYPE, SUPPLIER_BILL_STATUS, SUPPLIER_PAYMENT_STATUS } from "../../common";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const discountSchema = {
  value: { type: Number, default: 0, min: 0 },
  type: { type: String, enum: DISCOUNT_TYPE, default: DISCOUNT_TYPE.PERCENTAGE },
};

export const supplierBillItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    qty: { type: Number, min: 0 },
    freeQty: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, min: 0 },
    mrp: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 },
    discount1: discountSchema,
    discount2: discountSchema,
    taxableAmount: { type: Number, min: 0 },
    taxAmount: { type: Number, min: 0 },
    landingCost: { type: Number, min: 0 },
    margin: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
  },
  { _id: false },
);

const additionalChargeSchema = new Schema(
  {
    chargeId: { type: Schema.Types.ObjectId, ref: "additional-charge", required: true },
    value: { type: Number, min: 0 },
    taxRate: { type: Number },
    total: { type: Number },
  },
  { _id: false },
);

export const supplierBillReturnItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    batchNo: { type: String },
    qty: { type: Number, min: 0 },
    unit: { type: String },
    unitCost: { type: Number, min: 0 },
    discount1: discountSchema,
    discount2: discountSchema,
    taxableAmount: { type: Number, min: 0 },
    tax: { rate: { type: Number }, amount: { type: Number } },
    landingCost: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
  },
  { _id: false },
);

const supplierBillSchema = new Schema(
  {
    ...baseSchemaFields,

    supplierId: { type: Schema.Types.ObjectId, ref: "contact", required: true },

    supplierBillNo: { type: String },
    referenceBillNo: { type: String },
    supplierBillDate: { type: Date },

    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "purchase-order" },

    paymentTerm: { type: String },
    dueDate: { type: Date },

    reverseCharge: { type: Boolean, default: false },
    shippingDate: { type: Date },

    taxType: { type: String },
    invoiceAmount: { type: String },

    productDetails: [supplierBillItemSchema],
    returnProductDetails: [supplierBillReturnItemSchema],
    additionalCharges: [additionalChargeSchema],

    termsAndConditionId: { type: Schema.Types.ObjectId, ref: "terms-condition" },
    notes: { type: String },

    summary: {
      flatDiscount: discountSchema,
      grossAmount: Number,
      itemDiscount: Number,
      taxableAmount: Number,
      itemTax: Number,
      additionalChargeAmount: Number,
      additionalChargeTax: Number,
      billDiscount: Number,
      roundOff: Number,
      netAmount: Number,
    },

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

export const supplierBillModel = mongoose.model("supplier-bill", supplierBillSchema);
