import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IEmployee extends IBase {
    name: string;
    mobileNo: string;
    email?: string;
    designation?: string;
    role: Schema.Types.ObjectId;
    // branchId: Schema.Types.ObjectId; // Assigned Branch
    username?: string;
    password?: string; // Hashed
    status: 'active' | 'inactive';
    panNumber: string;
    address: {
        country: string;
        state: string;
        city: string;
        postalCode:string;
    };
    bankDetails:{
        bankHolderName:string;
        bankName:string;
        branch:string;
        accountNumber:string;
        IFSCCode:string;
        swiftCode:string;
    };
    wages:number;
    commission:number;
    extraWages:number;
    target:number;
}