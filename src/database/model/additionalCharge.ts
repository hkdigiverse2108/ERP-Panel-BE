import mongoose from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { ADDITIONAL_CHARGE_TYPE, VALUE_TYPE } from "../../common";

const additionalChargeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(ADDITIONAL_CHARGE_TYPE),
      default: ADDITIONAL_CHARGE_TYPE.PURCHASE,
    },

    name: {
      type: String,
      trim: true,
    },

    defaultValue: {
      value: { type: Number, default: 0, min: 0 },
      type: { type: String, enum: VALUE_TYPE, default: VALUE_TYPE.PERCENTAGE },
    },

    taxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tax",
    },

    accountGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account-group",
    },

    hsnSac: {
      type: String,
      trim: true,
    },

    ...baseSchemaFields,
  },
  baseSchemaOptions,
);

export const additionalChargeModel = mongoose.model("additional-charge", additionalChargeSchema);
