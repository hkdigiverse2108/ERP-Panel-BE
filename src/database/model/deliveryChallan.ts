import mongoose, { Schema } from "mongoose";
import { salesItemSchema } from "./salesOrder";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IDeliveryChallan } from "../../types";
import { SHIPPING_TYPE, DELIVERY_CHALLAN_STATUS, TAX_TYPE, PAYMENT_TERMS_ENUM } from "../../common";
// TODO: Continue This After The Estimate, Sales Order And Invoice Is Completed
const itemsSchema = new Schema({
  ...salesItemSchema.obj,
  refId: { type: Schema.Types.ObjectId, refPath: "createdFrom" },
}, { _id: false });

const deliveryChallanSchema = new Schema<IDeliveryChallan>(
  {
    ...baseSchemaFields,
    deliveryChallanNo: { type: String, index: true },
    date: { type: Date, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "contact", required: true },
    createdFrom: { type: String, enum: ["invoice", "sales-order", ""] },
    invoiceIds: [{ type: Schema.Types.ObjectId, ref: "invoice" }],
    salesOrderIds: [{ type: Schema.Types.ObjectId, ref: "sales-order" }],
    paymentTerms: { type: String, enum: Object.values(PAYMENT_TERMS_ENUM) },
    dueDate: { type: Date },
    texType: { type: String, enum: Object.values(TAX_TYPE), default: TAX_TYPE.DEFAULT },
    items: [itemsSchema],
    notes: [{ type: String }],
    reverseCharge: { type: Boolean, default: false },
    flatDiscount: { type: Boolean, default: false },
    flatDiscountPercent: { type: Number, default: 0 },
    flatDiscountAmount: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    shippingAddress: { type: String },
    billingAddress: { type: String },
    shippingType: { type: String, enum: Object.values(SHIPPING_TYPE) },
    status: { type: String, enum: Object.values(DELIVERY_CHALLAN_STATUS) },
  },
  baseSchemaOptions,
);

export const deliveryChallanModel = mongoose.model<IDeliveryChallan>("delivery-challan", deliveryChallanSchema);
