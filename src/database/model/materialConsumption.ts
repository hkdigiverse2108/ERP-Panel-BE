import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { CONSUMPTION_TYPE } from "../../common";

const materialConsumptionItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product" },
    variantId: { type: Schema.Types.ObjectId, ref: "product", default: null },
    qty: { type: Number },
    price: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
  },
  { _id: false },
);

const materialConsumptionSchema = new Schema(
  {
    ...baseSchemaFields,
    number: { type: String, index: true },
    date: { type: Date },
    consumptionTypeId: { type: Schema.Types.ObjectId, ref: "consumption-type" },
    remark: { type: String },
    items: [materialConsumptionItemSchema],
    totalQty: { type: Number },
    totalAmount: { type: Number },
  },
  baseSchemaOptions,
);

export const materialConsumptionModel = mongoose.model("material-consumption", materialConsumptionSchema);
