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

    address: {
      addressLine1: { type: String },
      addressLine2: { type: String },
      country: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      state: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      city: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      pinCode: { type: Number },
    },

    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "branch", default: null }],

    ...baseSchemaFields,
  },
  baseSchemaOptions,
);

export const bankModel = mongoose.model("bank", bankSchema);
