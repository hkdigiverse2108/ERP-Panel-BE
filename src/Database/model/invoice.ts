import mongoose, { Schema } from "mongoose";
import {salesItemSchema } from "./salesOrder";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IInvoice } from "../../types";
import { INVOICE_PAYMENT_STATUS } from "../../common";

// Invoice Schema

const invoiceSchema = new Schema<IInvoice>({
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: 'contact', required: true },
    customerName: { type: String },
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'salesOrder' },
    items: [salesItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: INVOICE_PAYMENT_STATUS, default: 'unpaid' },
    salesManId: { type: Schema.Types.ObjectId, ref: 'employee' },
    notes: { type: String },
    status: { type: String, default: 'active' }
}, baseSchemaOptions);


export const InvoiceModel = mongoose.model<IInvoice>('invoice', invoiceSchema);