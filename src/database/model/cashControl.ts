import { model, Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { CASH_CONTROL_TYPE } from "../../common";

const cashControlSchema = new Schema(
  {
    ...baseSchemaFields,
    type: { type: String, enum: Object.values(CASH_CONTROL_TYPE) },
    amount: { type: Number, min: 0 },
    remark: { type: String },
  },
  baseSchemaOptions,
);

export const CashControlModel = model("cash-control", cashControlSchema);
