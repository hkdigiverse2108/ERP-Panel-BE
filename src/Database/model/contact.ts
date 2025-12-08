import mongoose, { Schema } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from './base';
import { CONTACT_STATUS, CONTACT_TYPE } from '../../common';
import { IContact } from '../../types';

const contactSchema = new Schema<IContact>({
    ...baseSchemaFields,
    name: { type: String, required: true, index: true },
    contactPerson: { type: String },
    mobileNo: { type: String, required: true, index: true },
    whatsappNo: { type: String },
    email: { type: String },
    gstin: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    panNo: { type: String },

    type: { type: String, enum: CONTACT_TYPE, default: 'customer' },
    status: { type: String, enum: CONTACT_STATUS, default: 'active' },

    loyaltyPoints: { type: Number, default: 0 },
    membershipId: { type: Schema.Types.ObjectId, ref: 'membership' }
}, baseSchemaOptions);

export const contactModel = mongoose.model<IContact>('contact', contactSchema);