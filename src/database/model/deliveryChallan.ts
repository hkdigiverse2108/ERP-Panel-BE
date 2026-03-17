import mongoose, { Schema } from "mongoose";
import {
  baseSchemaFields,
  baseSchemaOptions,
  salesItemSchema,
  transactionSummarySchema,
  commonAdditionalChargeSchema,
  commonShippingSchema,
} from "./base";
import { IDeliveryChallan } from "../../types";
import { DELIVERY_CHALLAN_STATUS, TAX_TYPE, PAYMENT_TERMS_ENUM } from "../../common";
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
    placeOfSupply: { type: String },
    billingAddress: { type: Schema.Types.ObjectId },
    shippingAddress: { type: Schema.Types.ObjectId },
    createdFrom: { type: String, enum: ["invoice", "sales-order", ""] },
    invoiceIds: [{ type: Schema.Types.ObjectId, ref: "invoice" }],
    salesOrderIds: [{ type: Schema.Types.ObjectId, ref: "sales-order" }],
    paymentTerms: { type: String, enum: Object.values(PAYMENT_TERMS_ENUM) },
    dueDate: { type: Date, required: true },
    taxType: { type: String, enum: Object.values(TAX_TYPE), default: TAX_TYPE.DEFAULT },
    shippingDetails: { type: commonShippingSchema },
    items: [itemsSchema],
    transactionSummary: { type: transactionSummarySchema },
    additionalCharges: { type: [commonAdditionalChargeSchema] },
    reverseCharge: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(DELIVERY_CHALLAN_STATUS), default: DELIVERY_CHALLAN_STATUS.DELIVERED },
    termsAndConditionIds: { type: [Schema.Types.ObjectId], ref: 'terms-condition' },
    notes: { type: String },
  },
  baseSchemaOptions,
);

export const deliveryChallanModel = mongoose.model<IDeliveryChallan>("delivery-challan", deliveryChallanSchema);
