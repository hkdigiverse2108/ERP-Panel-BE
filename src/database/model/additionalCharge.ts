import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { ADDITIONAL_CHARGE_TYPE } from "../../common";

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
      type: Number,
      default: 0,
      min: 0,
    },

    taxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tax",
    },

    isTaxIncluding: { type: Boolean, default: false },

    hsnSac: {
      type: String,
      trim: true,
    },

    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "company", index: true },
    ...baseCommonFields,
  },
  baseSchemaOptions,
);

export const additionalChargeModel = mongoose.model("additional-charge", additionalChargeSchema);
