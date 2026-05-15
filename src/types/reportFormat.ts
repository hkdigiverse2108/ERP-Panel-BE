import { Document } from "mongoose";

export interface IFormat {
    name: string;
    isSystemDefault: boolean;
    isActive: boolean;
    isDeleted: boolean;
}

export interface IReportFormat extends Document {
    type: string;        // e.g., "POS", "Invoice"
    formats: IFormat[];  // List of designs for this type
    isActive: boolean;
    isDeleted: boolean;
    createdBy: any;
    updatedBy: any;
}
