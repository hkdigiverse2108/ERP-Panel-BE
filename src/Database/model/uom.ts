import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IBase } from "../../types";

export interface IUOM extends IBase {
    name: string;
    code: string;
}

const UOMSchema = new Schema<IUOM>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    code: { type: String, required: true }
}, baseSchemaOptions);

export const UOMModel = mongoose.model<IUOM>('UOM', UOMSchema);