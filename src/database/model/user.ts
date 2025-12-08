import mongoose from "mongoose";
import { USER_ROLES } from "../../common";
import { baseCommonFields, baseSchemaOptions } from "./base";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    password: { type: String },
    profileImage: { type: String },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    ...baseCommonFields,
  },
  baseSchemaOptions
);

export const userModel = mongoose.model("user", userSchema);
