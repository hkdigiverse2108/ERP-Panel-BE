import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IPrefix } from "../../types";

const prefixSchema = new Schema<IPrefix>({
    ...baseSchemaFields,
    module: { type: String, required: true },
    prefix: { type: String, required: true },
    startNumber: { type: Number, default: 1 },
    currentNumber: { type: Number, default: 1 }
}, baseSchemaOptions);

export const PrefixModel = mongoose.model<IPrefix>('prefix', prefixSchema);