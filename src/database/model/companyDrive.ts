import mongoose, { Schema } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from './base';
import { IBase } from '../../types';

export interface ICompanyDrive extends IBase {
    documentName: string;
    documentUrl: string;
    remark: string;
}

const companyDriveSchema = new Schema<ICompanyDrive>({
    ...baseSchemaFields,
    documentName: { type: String },
    documentUrl: { type: String },
    remark: { type: String },
}, baseSchemaOptions);

export const companyDriveModel = mongoose.model<ICompanyDrive>('company-drive', companyDriveSchema);