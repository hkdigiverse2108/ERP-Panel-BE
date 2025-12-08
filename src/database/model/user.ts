import mongoose from "mongoose";
import { USER_ROLES } from "../../common";
import { baseCommonFields } from "./base";

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
    // isDeleted: { type: Boolean, default: false },
    // isActive: { type: Boolean, default: false },
    // createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    // updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const userModel = mongoose.model("user", userSchema);
