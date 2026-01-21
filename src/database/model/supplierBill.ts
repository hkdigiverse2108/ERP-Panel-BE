import mongoose, { Schema } from "mongoose";
import { SUPPLIER_BILL_STATUS, SUPPLIER_PAYMENT_STATUS } from "../../common";
import { ISupplierBill } from "../../types/supplier";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { purchaseItemSchema } from "./purchaseOrder";

const supplierBillSchema = new Schema(
  {
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date },
    supplierId: { type: Schema.Types.ObjectId, ref: "contact", required: true },
    supplierName: { type: String },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "purchase-order" },
    materialInwardId: { type: Schema.Types.ObjectId, ref: "material-inward" },
    items: [purchaseItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: Object.values(SUPPLIER_PAYMENT_STATUS),
      default: SUPPLIER_PAYMENT_STATUS.UNPAID,
    },
    notes: { type: String },
    status: { type: String, enum: Object.values(SUPPLIER_BILL_STATUS), default: SUPPLIER_BILL_STATUS.ACTIVE },
  },
  baseSchemaOptions
);

export const supplierBillModel = mongoose.model("supplier-bill", supplierBillSchema);
