import { Schema } from "mongoose";
import { SchemaOptions } from "mongoose";

export const baseCommonFields = {
  isDeleted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
};

export const baseSchemaFields = {
  ...baseCommonFields,
  companyId: { type: Schema.Types.ObjectId, ref: "company", index: true },
  branchId: { type: Schema.Types.ObjectId, ref: "branch", index: true },
  locationId: { type: Schema.Types.ObjectId, ref: "location", index: true },
};

// export const baseSchemaOptions = {
//   timestamps: true,
//   versionKey: false,
//   // toJSON: { virtuals: false, versionKey: false },
//   // toObject: { virtuals: false, versionKey: false },
// };

export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
};
