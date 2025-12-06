import mongoose, { Schema } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from './base';
import { ITax } from '../../types';

const taxSchema = new Schema<ITax>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    percentage: { type: Number, required: true },
    type: { type: String, required: true }
}, baseSchemaOptions);

export const taxModel = mongoose.model<ITax>('tax', taxSchema);