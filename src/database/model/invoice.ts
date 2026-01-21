import mongoose, { Schema } from "mongoose";
import {salesItemSchema } from "./salesOrder";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IInvoice } from "../../types";
import { INVOICE_PAYMENT_STATUS, INVOICE_STATUS } from "../../common";

// Invoice Schema

const invoiceSchema = new Schema<IInvoice>({
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: 'contact', required: true },
    customerName: { type: String },
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'sales-order' },
    items: [salesItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: Object.values(INVOICE_PAYMENT_STATUS), default: INVOICE_PAYMENT_STATUS.UNPAID },
    salesManId: { type: Schema.Types.ObjectId, ref: 'employee' },
    notes: { type: String },
    status: { type: String, enum: Object.values(INVOICE_STATUS), default: INVOICE_STATUS.ACTIVE }
}, baseSchemaOptions);


export const InvoiceModel = mongoose.model<IInvoice>('invoice', invoiceSchema);