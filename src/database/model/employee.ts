import mongoose, { Schema } from "mongoose";
import { IEmployee } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import permissionsSchema from "./permissions";

const employeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true },
    phoneNo: { type: String, required: true },
    email: { type: String, default: null }, // removed unique
    designation: { type: String },
    role: { type: Schema.Types.ObjectId, ref: "role", default: null },
    username: { type: String },
    password: { type: String },
    panNumber: { type: String },
    address: {
      address: { type: String },
      country: { type: String },
      state: { type: String },
      city: { type: String },
      postalCode: { type: Number },
    },
    bankDetails: {
      bankHolderName: { type: String },
      bankName: { type: String },
      branchName: { type: String },
      accountNumber: { type: String },
      IFSCCode: { type: String },
      swiftCode: { type: String },
    },
    permissions: { type: permissionsSchema, default: {} },
    wages: { type: Number },
    commission: { type: Number },
    extraWages: { type: Number },
    target: { type: Number },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

export const employeeModel = mongoose.model<IEmployee>("employee", employeeSchema);
