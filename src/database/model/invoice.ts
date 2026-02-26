import mongoose, { Schema } from "mongoose";
import { salesItemSchema } from "./salesOrder";
import { baseSchemaFields, baseSchemaOptions, transectionSummarySchema, commonAdditionalChargeSchema } from "./base";
import { IInvoice } from "../../types";
import { INVOICE_PAYMENT_STATUS, INVOICE_STATUS } from "../../common";

// Invoice Schema

const invoiceSchema = new Schema<IInvoice>({
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: 'contact', required: true },
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'sales-order' },
    items: [salesItemSchema],
    transectionSummary: { type: transectionSummarySchema },
    additionalCharges: { type: [commonAdditionalChargeSchema] },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: Object.values(INVOICE_PAYMENT_STATUS), default: INVOICE_PAYMENT_STATUS.UNPAID },
    salesManId: { type: Schema.Types.ObjectId, ref: 'employee' },
    notes: [{ type: String }],
    status: { type: String, enum: Object.values(INVOICE_STATUS), default: INVOICE_STATUS.ACTIVE }
}, baseSchemaOptions);


export const InvoiceModel = mongoose.model<IInvoice>('invoice', invoiceSchema);