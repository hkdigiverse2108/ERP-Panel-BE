// import mongoose from "mongoose";
// import { USER_TYPES } from "../../common";
// import { baseSchemaFields, baseSchemaOptions } from "./base";

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
    email: { type: String },
    phoneNo: { type: String },
    password: { type: String },
    companyId: { type: mongoose.Types.ObjectId, ref: "company", default: null },
    profileImage: { type: String },
    role: {
      type: String,
      enum: Object.values(USER_TYPES),
      default: USER_TYPES.ADMIN,
    },
    permissions: { type: permissionsSchema, default: {} },
    ...baseSchemaFields,
  },
  baseSchemaOptions
);

export const userModel = mongoose.model<IUser>("user", userSchema);