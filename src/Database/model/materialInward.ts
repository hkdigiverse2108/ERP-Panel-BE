import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IMaterialInward } from "../../types";
import { purchaseItemSchema } from "./purchaseOrder";

const materialInwardSchema = new Schema<IMaterialInward>(
  {
    ...baseSchemaFields,
    documentNo: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "contact", required: true },
    supplierName: { type: String },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "purchaseOrder" },
    items: [purchaseItemSchema],
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    notes: { type: String },
    status: { type: String, default: "active" },
  },
  baseSchemaOptions
);

export const materialInwardModel = mongoose.model<IMaterialInward>(
  "materialInward",
  materialInwardSchema
);
