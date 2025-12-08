import mongoose, { Schema } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from './base';
import { IBase } from '../../types';


export interface ICategory extends IBase {
    name: string;
    code: string;
    description?: string;
    parentCategoryId?: Schema.Types.ObjectId;
    image?: string;
}

const categorySchema = new Schema<ICategory>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String },
    parentCategoryId: { type: Schema.Types.ObjectId, ref: 'category' },
    image: { type: String }
}, baseSchemaOptions);

export const categoryModel = mongoose.model<ICategory>('category', categorySchema);