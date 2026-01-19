import mongoose, { Schema } from "mongoose";
import { CONTACT_STATUS, CONTACT_TYPE, CUSTOMER_TYPE, SUPPLIER_TYPE } from "../../common";
import { IContact } from "../../types";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const contactSchema = new Schema<IContact>(
  {
    ...baseSchemaFields,
    firstName: { type: String, required: true, index: true },
    lastName: { type: String, index: true },
    companyName: { type: String },
    email: { type: String },
    // contactPerson: { type: String },
    panNo: { type: String },
    telephoneNo: { type: String },
    remarks: { type: String },
    phoneNo: {
      countryCode: { type: String },
      phoneNo: { type: Number },
    },
    whatsappNo: {
      countryCode: { type: String },
      phoneNo: { type: Number },
    },
    dob: { type: Date },
    anniversaryDate: { type: Date },

    paymentMode: { type: String },
    paymentTerms: { type: String },
    openingBalance: {
      debitBalance: { type: String },
      creditBalance: { type: String },
    },

    address: [
      {
        gstType: { type: String },
        gstIn: { type: String },
        contactFirstName: { type: String },
        contactLastName: { type: String },
        contactCompanyName: { type: String },
        contactNo: {
          countryCode: { type: String },
          phoneNo: { type: Number },
        },
        contactEmail: { type: String },
        addressLine1: { type: String },
        addressLine2: { type: String },
        country: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
        state: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
        city: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
        pinCode: { type: String },
      },
    ],
    tanNo: { type: String },
    bankDetails: {
      ifscCode: { type: String },
      name: { type: String },
      branch: { type: String },
      accountNumber: { type: String },
    },

    productDetails: [{ type: String }],
    contactType: { type: String, enum: Object.values(CONTACT_TYPE), default: CONTACT_TYPE.CUSTOMER },
    status: { type: String, enum: Object.values(CONTACT_STATUS), default: CONTACT_STATUS.ACTIVE },
    loyaltyPoints: { type: Number, default: 0 },
    membershipId: { type: Schema.Types.ObjectId, ref: "membership" },
    // ************************* customer *************************

    customerCategory: { type: String },
    customerType: { type: String, enum: Object.values(CUSTOMER_TYPE) },

    // ************************* Supplier *************************
    supplierType: { type: String, enum: Object.values(SUPPLIER_TYPE) },

    // ************************* Transport *************************
    transporterId: { type: String },
  },
  baseSchemaOptions,
);

export const contactModel = mongoose.model<IContact>("contact", contactSchema);
