import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const materialConsumptionItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product" },
    itemCode: { type: String },
    uomId: { type: Schema.Types.ObjectId, ref: "uom" },
    qty: { type: Number },
    unitPrice: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const materialConsumptionSchema = new Schema(
  {
    ...baseSchemaFields,
    consumptionNo: { type: String, index: true },
    consumptionDate: { type: Date },
    userId: { type: Schema.Types.ObjectId, ref: "user" },
    consumptionType: { type: String },
    remark: { type: String },
    items: { type: [materialConsumptionItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
  },
  baseSchemaOptions
);

export const materialConsumptionModel = mongoose.model("materialConsumption", materialConsumptionSchema);
