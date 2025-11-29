import { USER_ROLES } from "../../common";

const mongoose = require("mongoose");

const userSchema: any = new mongoose.Schema(
  {
    fullName: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    password: { type: String },
    profilePhoto: { type: String },
    agreeTerms: { type: String },
    role: { type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.USER },
    isDeleted: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
  },
  { timeStamps: true, visionKey: false }
);

export const userModal = mongoose.model("user", userSchema);
