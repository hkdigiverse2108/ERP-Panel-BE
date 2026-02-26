import { Schema } from "mongoose";
import { SchemaOptions } from "mongoose";
import { SHIPPING_TYPE } from "../../common";
import { transport } from "winston";

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
};

export const baseSchemaOptions: SchemaOptions<any> = {
  timestamps: true,
  versionKey: false,
};

export const commonShippingSchema = new Schema(
  {
    shippingType: { type: String, enum: Object.values(SHIPPING_TYPE) },
    shippingDate: { type: Date },
    referenceNo: { type: String },
    transportDate: { type: Date },
    modeOfTransport: { type: String },
    transporterId: {
      type: Schema.Types.ObjectId,
      ref: "contact",
    },
    vehicleNo: { type: String },
    weight: { type: Number },
  },
  { _id: false },
);
