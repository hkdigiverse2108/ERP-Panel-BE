import mongoose, { Schema } from "mongoose";
import { baseSchemaOptions } from "./base";
import { ILoyaltyPoints } from "../../types";

const loyaltyPointsSchema = new Schema<ILoyaltyPoints>(
  {
    amount: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    branchId: { type: Schema.Types.ObjectId, ref: "branch", default: null },
    companyId: { type: Schema.Types.ObjectId, ref: "company", default: null },
  },
  baseSchemaOptions,
);

export const loyaltyPointsModel = mongoose.model<ILoyaltyPoints>("loyalty-point", loyaltyPointsSchema);
