import mongoose from 'mongoose';
import { baseCommonFields } from './base';

const branchSchema: any = new mongoose.Schema(
    {
        name: { type: String },
        address: { type: String },
        ...baseCommonFields,
    },
    { timestamps: true, versionKey: false }
);

export const branchModel = mongoose.model("branch", branchSchema);
