import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions, commonAdditionalChargeSchema } from "./base";
import { RETURN_POS_ORDER_TYPE } from "../../common";

export const returnPosItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    qty: { type: Number },
    mrp: { type: Number },
    discountAmount: { type: Number, default: 0 },
    additionalDiscountAmount: { type: Number, default: 0 },
    unitCost: { type: Number },
    netAmount: { type: Number },
    returnedQty: { type: Number, default: 0 },
  },
  { _id: false },
);

const returnPosOrderSchema = new mongoose.Schema(
  {
    returnOrderNo: { type: String, required: true, index: true },
    posOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "pos-order" },
    posCashRegisterId: { type: mongoose.Schema.Types.ObjectId, ref: "pos-cash-register", default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "contact" },
    salesManId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    items: [returnPosItemSchema],
    type: { type: String, enum: Object.values(RETURN_POS_ORDER_TYPE), default: RETURN_POS_ORDER_TYPE.SALES_RETURN },
    reason: { type: String },

    refundViaCash: { type: Number, default: 0 },
    refundViaBank: { type: Number, default: 0 },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "bank" },
    refundDescription: { type: String },
    additionalCharges: [commonAdditionalChargeSchema],
    roundOff: { type: Number, default: 0 },
    flatDiscount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number },
    ...baseSchemaFields,
  },
  baseSchemaOptions,
);

export const returnPosOrderModel = mongoose.model("return-pos-order", returnPosOrderSchema);
