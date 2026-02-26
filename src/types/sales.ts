import { Schema } from "mongoose";
import { IBase } from "./base";

export interface ISalesDocument extends IBase {
    documentNo: string;
    date: Date;
    dueDate?: Date;
    customerId: Schema.Types.ObjectId;

    items: any[];

    transectionSummary: any;
    additionalCharges: any[];

    notes?: string[];
    status: string;
    reverseCharge: boolean;
    paymentTerms?: Schema.Types.ObjectId[];
    taxType?: string;
    sez?: string;
    placeOfSupply: string;
    billingAddress: Schema.Types.ObjectId;
    shippingAddress: Schema.Types.ObjectId;
}

export interface IEstimate extends ISalesDocument {
    estimateNo: string;
}
export interface ISalesOrder extends ISalesDocument { }