import { Schema } from "mongoose";
import { IBase } from "./base";

export interface IContact extends IBase {
    name: string;
    contactPerson?: string;
    mobileNo: string;
    whatsappNo?: string;
    email?: string;
    gstin?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    panNo?: string;

    type: 'customer' | 'supplier' | 'both';
    status: 'active' | 'inactive';

    // CRM
    loyaltyPoints: number;
    membershipId?: Schema.Types.ObjectId;
}