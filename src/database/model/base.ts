import { Schema } from "mongoose";

export const baseCommonFields = {
  isDeleted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
};

export const baseSchemaFields = {
  ...baseCommonFields,
  companyId: { type: Schema.Types.ObjectId, ref: "company", index: true },
  branchId: { type: Schema.Types.ObjectId, ref: "branch", index: true },
  locationId: { type: Schema.Types.ObjectId, ref: "location", index: true },
  //   createdBy: { type: Schema.Types.ObjectId, ref: "user" },
  //   updatedBy: { type: Schema.Types.ObjectId, ref: "user" },
  //   isDeleted: { type: Boolean, default: false, index: true },
  //   isActive: { type: Boolean, default: true, index: true },
};

export const baseSchemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};
