import mongoose from "mongoose";
import { USER_TYPES } from "../../common";
import permissionsSchema from "./permissions";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IUser } from "../../types/user";

// const userSchema = new mongoose.Schema(
//   {
//     fullName: { type: String },
//     email: { type: String },
//     phoneNo: { type: String },
//     password: { type: String },
//     companyId: { type: mongoose.Types.ObjectId, ref: 'company', required: false, default: null },
//     profileImage: { type: String },
//     permissions: {
//       dashboard: { "read": true, "create": false, "update": false, "delete": false },
//       profile: { "read": true, "create": true, "update": false, "delete": false }
//     },
//     role: {
//       type: String,
//       enum: Object.values(USER_TYPES),
//       default: USER_TYPES.ADMIN,
//     },
//     ...baseSchemaFields,
//   },
//   baseSchemaOptions
// );

// export const userModel = mongoose.model("user", userSchema);

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
    permissions: { type: permissionsSchema, default: {} },

    designation: { type: String },
    username: { type: String },

    panNumber: { type: String },
    address: {
      address: { type: String },
      country: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      state: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      city: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
      postalCode: { type: Number },
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

    ...baseSchemaFields,
  },
  baseSchemaOptions
);

export const userModel = mongoose.model<IUser>("user", userSchema);
