import mongoose from "mongoose";

const userAccountDeletionSchema = new mongoose.Schema(
  {
    userId: { type: String },
    fullName: { type: String },
    email: { type: String },
    reason: { type: String },
    rate: { type: Number },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export const userAccountDeletionModel = mongoose.model("user-account-deletion", userAccountDeletionSchema);
