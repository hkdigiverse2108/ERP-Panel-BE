import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions, transactionSummarySchema, commonAdditionalChargeSchema, salesItemSchema, commonShippingSchema } from "./base";
import { IInvoice } from "../../types";
import { INVOICE_PAYMENT_STATUS, INVOICE_STATUS, PAYMENT_TERMS_ENUM, TAX_TYPE, INVOICE_CREATED_FROM, PAYMENT_MODE } from "../../common";

const invoiceItemSchema = new Schema({
    refId: { type: Schema.Types.ObjectId, ref: 'estimate' },
    ...salesItemSchema.obj,
});

// Invoice Schema
const invoiceSchema = new Schema<IInvoice>({
    ...baseSchemaFields,
    invoiceNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'contact', required: true },
    placeOfSupply: { type: String },
    billingAddress: { type: Schema.Types.ObjectId },
    shippingAddress: { type: Schema.Types.ObjectId },
    paymentTerms: { type: String, enum: Object.values(PAYMENT_TERMS_ENUM) },
    accountLedgerId: { type: Schema.Types.ObjectId, ref: 'account-group' },
    createdFrom: { type: String, enum: Object.values(INVOICE_CREATED_FROM) },
    taxType: { type: String, enum: Object.values(TAX_TYPE) },
    shippingDetails: { type: commonShippingSchema },
    items: [salesItemSchema],
    transectionSummary: { type: transactionSummarySchema },
    additionalCharges: { type: [commonAdditionalChargeSchema] },
    paidAmount: { type: Number, default: 0 },
    payType: { type: String, enum: Object.values(PAYMENT_MODE) },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: Object.values(INVOICE_PAYMENT_STATUS), default: INVOICE_PAYMENT_STATUS.UNPAID },
    salesManId: { type: Schema.Types.ObjectId, ref: 'user' },
    notes: [{ type: String }],
    status: { type: String, enum: Object.values(INVOICE_STATUS), default: INVOICE_STATUS.ACTIVE }
}, baseSchemaOptions);


export const InvoiceModel = mongoose.model<IInvoice>('invoice', invoiceSchema);