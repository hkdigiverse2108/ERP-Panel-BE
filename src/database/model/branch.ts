import mongoose from "mongoose";
import { baseCommonFields } from "./base";

const branchSchema: any = new mongoose.Schema(
  {
    name: { type: String },
    displayName: { type: String },
    contactName: { type: String },

    phoneNo: {
      countryCode: { type: String },
      phoneNo: { type: Number },
    },
    telephoneNumber: { type: String },
    email: { type: String },
    userName: { type: String },
    password: { type: String },
    yearInterval: { type: String },

    // ******************* Other Details *******************
    gstRegistrationType: { type: String },
    gstIdentificationNumber: { type: String },
    panNo: { type: String },

    // ******************* Communication Details *******************
    webSite: { type: String },
    fssaiNo: { type: String, length: 14 },

    address: { type: String },
    city: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
    country: { type: mongoose.Schema.Types.ObjectId, ref: "location", default: null },
    pinCode: { type: String },
    // timeZone: { type: String },

    // ******************* Bank Details *******************
    bankId: { type: mongoose.Schema.Types.ObjectId, ref: "bank" },
    upiId: { type: String },

    outletSize: { type: String },

    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "company", index: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] }],

    ...baseCommonFields,
  },
  { timestamps: true, versionKey: false },
);

export const branchModel = mongoose.model("branch", branchSchema);
