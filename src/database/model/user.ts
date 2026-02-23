import mongoose from "mongoose";
import { USER_TYPES } from "../../common";
import permissionsSchema from "./permissions";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IUser } from "../../types/user";

const userSchema = new mongoose.Schema<IUser>(
  {
    fullName: { type: String },
    email: { type: String, lowercase: true, trim: true },
    phoneNo: {
      countryCode: { type: String },
      phoneNo: { type: Number },
    },
    password: { type: String },
    showPassword: { type: String },
    profileImage: { type: String },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "role",
      default: null,
    },

    userType: { type: String, enum: Object.values(USER_TYPES), },

    permissions: { type: permissionsSchema, default: {} },

    designation: { type: String },
    username: { type: String },

    panNumber: { type: String },
    address: {
      address: { type: String },
      country: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      state: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      city: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      pinCode: { type: Number },
    },
    bankDetails: {
      bankHolderName: { type: String },
      name: { type: String },
      branchName: { type: String },
      accountNumber: { type: String },
      IFSCCode: { type: String },
      swiftCode: { type: String },
    },
    wages: { type: Number },
    commission: { type: Number },
    extraWages: { type: Number },
    target: { type: Number },

    otp: { type: Number, default: null },
    otpExpireTime: { type: Date, default: null },


    ...baseSchemaFields,
  },
  baseSchemaOptions,
);

export const userModel = mongoose.model<IUser>("user", userSchema);
