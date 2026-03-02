import mongoose, { Schema } from "mongoose";
import { ISalesOrder } from "../../types/sales";
import { baseSchemaFields, baseSchemaOptions, commonAdditionalChargeSchema, transactionSummarySchema, salesItemSchema, commonShippingSchema } from "./base";
import { PAYMENT_TERMS_ENUM, SALES_ORDER_STATUS, TAX_TYPE } from "../../common";

const salesOrderItemSchema = new Schema(
  {
    refId: { type: Schema.Types.ObjectId, ref: "estimate" },
    ...salesItemSchema.obj,
  }
);

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    ...baseSchemaFields,
    salesOrderNo: { type: String, index: true },
    date: { type: Date },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: "contact" },
    placeOfSupply: { type: String },
    billingAddress: { type: Schema.Types.ObjectId },
    shippingAddress: { type: Schema.Types.ObjectId },
    paymentTerms: { type: String, enum: Object.values(PAYMENT_TERMS_ENUM) },
    taxType: { type: String, enum: Object.values(TAX_TYPE) },
    salesManId: { type: Schema.Types.ObjectId, ref: "user" },
    selectedEstimateId: { type: Schema.Types.ObjectId, ref: "estimate" },
    items: [salesOrderItemSchema],
    transectionSummary: { type: transactionSummarySchema },
    additionalCharges: { type: [commonAdditionalChargeSchema] },
    termsAndConditionIds: [{ type: Schema.Types.ObjectId, ref: "terms-condition" }],
    status: { type: String, enum: Object.values(SALES_ORDER_STATUS), default: SALES_ORDER_STATUS.PENDING },
    shippingDetails: { type: commonShippingSchema },
  },
  baseSchemaOptions,
);

export const SalesOrderModel = mongoose.model<ISalesOrder>("sales-order", SalesOrderSchema);
