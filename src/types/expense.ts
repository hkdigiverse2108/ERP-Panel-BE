import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IExpense extends IBase {
    amount: number;
    image: string;
    description: string;
    isSalary: boolean;
    partyId: Schema.Types.ObjectId;
    type: string;
    fromDate: Date;
    toDate: Date;
    incentive: number;
    total: number
}