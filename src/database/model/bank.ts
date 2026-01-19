import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const bankSchema = new mongoose.Schema(
  {
    name: { type: String },
    ifscCode: { type: String },
    branchName: { type: String },
    accountHolderName: { type: String },
    bankAccountNumber: { type: String },
    swiftCode: { type: String },
    openingBalance: {
      creditBalance: { type: String },
      debitBalance: { type: String },
    },
    upiId: { type: String },

    addressLine1: { type: String },
    addressLine2: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    zipCode: { type: String },

    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "branch", default: null }],

    ...baseSchemaFields,
  },
  baseSchemaOptions,
);

export const bankModel = mongoose.model("bank", bankSchema);
