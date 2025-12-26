import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const bankSchema = new mongoose.Schema(
  {
    bankName: { type: String },
    bankIFSC: { type: String },
    upiId: { type: String },
    branchName: { type: String },
    accountHolderName: { type: String },
    bankAccountNumber: { type: String },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

export const bankModel = mongoose.model("bank", bankSchema);
