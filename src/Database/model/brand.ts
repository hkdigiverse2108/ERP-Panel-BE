import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions} from "./base";
import { IBase } from "../../types";

export interface IBrand extends IBase {
    name: string;
    code: string;
    description?: string;
    parentBrandId?: Schema.Types.ObjectId;
    image?: string;
}

const brandSchema = new Schema<IBrand>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String },
    parentBrandId: { type: Schema.Types.ObjectId, ref: 'brand' },
    image: { type: String }
}, baseSchemaOptions);

export const brandModel = mongoose.model<IBrand>('brand', brandSchema);
