import mongoose from "mongoose";
import { baseCommonFields } from "./base";

const branchSchema: any = new mongoose.Schema(
  {
    name: { type: String },
    address: { type: String },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "company", index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "location", index: true },

    ...baseCommonFields,
  },
  { timestamps: true, versionKey: false }
);

export const branchModel = mongoose.model("branch", branchSchema);
