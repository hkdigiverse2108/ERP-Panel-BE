import mongoose, { Schema } from 'mongoose';
import { CONTACT_STATUS, CONTACT_TYPE, CUSTOMER_TYPE, SUPPLIER_TYPE } from '../../common';
import { IContact } from '../../types';
import { baseSchemaFields, baseSchemaOptions } from './base';

const contactSchema = new Schema<IContact>({
    ...baseSchemaFields,
    firstName: { type: String, required: true, index: true },
    lastName: { type: String, index: true },
    companyName: { type: String },
    contactPerson: { type: String },
    mobileNo: { type: String, required: true, index: true },
    whatsappNo: { type: String },
    email: { type: String },
    gstin: { type: String },
    transporterId: { type: String },
    productDetails: [{ type: String }],
    addressDetails: [
        {
            GSTType: { type: String },
            GSTIn: { type: String, required: true, unique: true },
            contactFirstName: { type: String },
            contactLastName: { type: String },
            contactCompanyName: { type: String },
            contactNo: { type: String },
            contactEmail: { type: String },
            addressLine1: { type: String },
            addressLine2: { type: String },
            state: { type: String, required: true },
            city: { type: String, required: true },
            TANNo: { type: String },
            country: {
                id: { type: String },
                name: { type: String },
            },
            pinCode: { type: String },
        }
    ],
    bankDetails: {
        IFSCCode: { type: String },
        name: { type: String },
        branch: { type: String },
        accountNumber: { type: String },
    },
    panNo: { type: String },
    type: { type: String, enum: CONTACT_TYPE, default: 'customer' },
    customerType: { type: String, enum: CUSTOMER_TYPE, default: 'retailer' },
    supplierType: { type: String, enum: SUPPLIER_TYPE, default: 'manufacturer' },
    status: { type: String, enum: CONTACT_STATUS, default: 'active' },
    loyaltyPoints: { type: Number, default: 0 },
    membershipId: { type: Schema.Types.ObjectId, ref: 'membership' }
}, baseSchemaOptions);

export const contactModel = mongoose.model<IContact>('contact', contactSchema);