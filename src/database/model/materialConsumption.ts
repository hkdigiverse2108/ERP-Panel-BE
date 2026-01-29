import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { CONSUMPTION_TYPE } from "../../common";

const materialConsumptionItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product" },
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
    type: { type: String, enum: Object.values(CONSUMPTION_TYPE), default: CONSUMPTION_TYPE.PRODUCTION },
    remark: { type: String },
    items: [materialConsumptionItemSchema],
    totalQty: { type: Number },
    totalAmount: { type: Number },
  },
  baseSchemaOptions,
);

export const materialConsumptionModel = mongoose.model("material-consumption", materialConsumptionSchema);
