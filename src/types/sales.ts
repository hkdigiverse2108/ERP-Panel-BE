import { Schema } from "mongoose";
import { IBase } from "./base";

export interface ISalesDocument extends IBase {
    documentNo: string;
    date: Date;
    dueDate?: Date;
    customerId: Schema.Types.ObjectId;
    customerName: string; // Snapshot

    items: any[];

    grossAmount: number;
    discountAmount: number;
    taxAmount: number;
    roundOff: number;
    netAmount: number;

    notes?: string;
    status: string;
}

export interface IEstimate extends ISalesDocument { }
export interface ISalesOrder extends ISalesDocument { }