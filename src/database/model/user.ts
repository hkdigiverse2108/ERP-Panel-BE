import mongoose from "mongoose";
import { USER_ROLES } from "../../common";
import { commonFields } from "./commonFields";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    password: { type: String },
    profilePhoto: { type: String },
    agreeTerms: { type: Boolean, default: false },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    ...commonFields,
    // isDeleted: { type: Boolean, default: false },
    // isBlocked: { type: Boolean, default: false },
    // createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    // updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const userModel = mongoose.model("user", userSchema);
