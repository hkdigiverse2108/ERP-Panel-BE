import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IBase } from "../../types";

export interface IUOM extends IBase {
    name: string;
    code: string;
}

const uomSchema = new Schema<IUOM>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    code: { type: String, default: null }
  },
  baseSchemaOptions
);

export const uomModel = mongoose.model<IUOM>("uom", uomSchema);