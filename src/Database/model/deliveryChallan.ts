import mongoose, { Schema } from "mongoose";
import {  salesItemSchema } from "./salesOrder";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IDeliveryChallan } from "../../types";


const deliveryChallanSchema = new Schema<IDeliveryChallan>({
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'contact', required: true },
    customerName: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'invoice' },
    items: [salesItemSchema],
    notes: { type: String },
    status: { type: String, default: 'pending' }
}, baseSchemaOptions);

export const deliveryChallanModel = mongoose.model<IDeliveryChallan>('deliveryChallan', deliveryChallanSchema);