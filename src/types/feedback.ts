import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IFeedback extends IBase {
    invoiceId?: Schema.Types.ObjectId;
    customerId?: Schema.Types.ObjectId;
    rating: number;
    comment?: string;
    isRecommended: boolean;
}