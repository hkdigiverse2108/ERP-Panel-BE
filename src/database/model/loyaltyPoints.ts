import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { ILoyaltyPoints } from "../../types";

const loyaltyPointsSchema = new Schema<ILoyaltyPoints>(
  {
    ...baseSchemaFields,
    amount: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

export const loyaltyPointsModel = mongoose.model<ILoyaltyPoints>("loyalty-point", loyaltyPointsSchema);
