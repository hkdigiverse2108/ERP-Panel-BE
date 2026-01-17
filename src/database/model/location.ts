import mongoose, { Schema } from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";
import { ILocation } from "../../types";
import { LOCATION_TYPE } from "../../common";

const locationSchema = new Schema<ILocation>(
  {
    ...baseCommonFields,

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: Object.values(LOCATION_TYPE),
      required: true, 
    },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: "location",
      default: null, 
    },

    code: {
      type: String,
      trim: true,
      uppercase: true, 
    },
  },
  baseSchemaOptions
);

export const locationModel = mongoose.model<ILocation>("location", locationSchema);
