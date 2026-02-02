import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { salesItemSchema } from "./salesOrder";
import { POS_ORDER_STATUS, POS_ORDER_TYPE, POS_PAYMENT_METHOD, POS_PAYMENT_STATUS } from "../../common";

// POS Order Schema
const posOrderSchema = new Schema(
  {
    ...baseSchemaFields,
    orderNo: { type: String, required: true, index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "contact" },
    orderType: { type: String, enum: Object.values(POS_ORDER_TYPE), default: POS_ORDER_TYPE.WALK_IN },

    items: [salesItemSchema],
    remark: { type: String },
    totalQty: { type: Number, default: 0 },
    totalMrp: { type: Number, default: 0 },
    totalTaxAmount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    paymentMethod: { type: String, enum: Object.values(POS_PAYMENT_METHOD), default: POS_PAYMENT_METHOD.CASH },
    paymentStatus: { type: String, enum: Object.values(POS_PAYMENT_STATUS), default: POS_PAYMENT_STATUS.PAID },
    status: { type: String, enum: Object.values(POS_ORDER_STATUS), default: POS_ORDER_STATUS.PENDING },
    holdDate: { type: Date },
    notes: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: "invoice" },

    // grossAmount: { type: Number, default: 0 },
    // discountAmount: { type: Number, default: 0 },
    // taxAmount: { type: Number, default: 0 },
    // netAmount: { type: Number, default: 0 },
    // paidAmount: { type: Number, default: 0 },
    // balanceAmount: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

export const PosOrderModel = mongoose.model("pos-order", posOrderSchema);
