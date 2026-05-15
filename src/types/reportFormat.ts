import { Document } from "mongoose";

export interface IReportFormat extends Document {
    type: string;
    name: string;
    isActive: boolean;
    isSystemDefault: boolean;
    isDeleted: boolean;
    createdBy: any;
    updatedBy: any;
}
