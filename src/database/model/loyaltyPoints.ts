import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { ILoyaltyPoints } from "../../types";

const loyaltyPointsSchema = new Schema<ILoyaltyPoints>(
  {
    amount: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    companyId: { type: Schema.Types.ObjectId, ref: "company", index: true },
    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const loyaltyPointsModel = mongoose.model<ILoyaltyPoints>("loyalty-point", loyaltyPointsSchema);
