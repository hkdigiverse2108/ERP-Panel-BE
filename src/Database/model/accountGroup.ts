import mongoose, { Schema } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from './base';
import { IAccountGroup } from '../../types';
import { ACCOUNT_NATURE } from '../../common';


const accountGroupSchema = new Schema<IAccountGroup>({
    ...baseSchemaFields,
    name: { type: String, required: true },
    parentGroupId: { type: Schema.Types.ObjectId, ref: 'accountGroup' },
    nature: { type: String, enum: ACCOUNT_NATURE, required: true }
}, baseSchemaOptions);

export const accountGroupModel = mongoose.model<IAccountGroup>('accountGroup', accountGroupSchema);
