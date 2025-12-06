import mongoose, { Schema } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from './base';
import { IPurchaseOrder } from '../../types';

// Shared Item Schema for Purchase Documents
export const purchaseItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'product', required: true },
    productName: { type: String, required: true },
    batchNo: { type: String },
    qty: { type: Number, required: true },
    receivedQty: { type: Number, default: 0 }, // For PO tracking
    uom: { type: String },
    price: { type: Number, required: true }, // Unit Cost
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxId: { type: Schema.Types.ObjectId, ref: 'tax' },
    taxPercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true }
}, { _id: false });

const purchaseOrderSchema = new Schema<IPurchaseOrder>({
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    supplyDate: { type: Date },
    supplierId: { type: Schema.Types.ObjectId, ref: 'contact', required: true },
    supplierName: { type: String },
    items: [purchaseItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    notes: { type: String },
    status: { type: String, default: 'pending' } // Pending, Received, Cancelled
}, baseSchemaOptions);

export const purchaseOrderModel = mongoose.model<IPurchaseOrder>('purchaseOrder', purchaseOrderSchema);