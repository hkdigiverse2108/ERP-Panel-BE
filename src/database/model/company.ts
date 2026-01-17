import mongoose from "mongoose";
import { baseCommonFields, baseSchemaOptions } from "./base";

const companySchema: any = new mongoose.Schema(
  {
    // ******************* Basic Details *******************
    accountingType: { type: String },
    name: { type: String },
    displayName: { type: String },
    contactName: { type: String },
    // ownerNo: { type: String },
    ownerNo: {
      countryCode: { type: String },
      phoneNo: { type: Number },
    },
    supportEmail: { type: String },
    email: { type: String },
    // phoneNo: { type: String },
    phoneNo: {
      countryCode: { type: String },
      phoneNo: { type: Number },
    },
    customerCareNumber: { type: String },

    // ******************* Communication Details *******************
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    pinCode: { type: String },
    // timeZone: { type: String },
    webSite: { type: String },

    // ******************* Bank Details *******************
    bankId: { type: mongoose.Schema.Types.ObjectId, ref: "bank" },
    upiId: { type: String },
    // name: { type: String },
    // bankIFSC: { type: String },
    // branchName: { type: String },
    // accountHolderName: { type: String },
    // bankAccountNumber: { type: String },

    // ******************* Other Details *******************
    userName: { type: String },
    panNo: { type: String },
    gstRegistrationType: { type: String },
    gstIdentificationNumber: { type: String },
    financialMonthInterval: { type: String },
    // defaultFinancialYear: { type: String },

    corporateIdentificationNumber: { type: String },
    letterOfUndertaking: { type: String },
    taxDeductionAndCollectionAccountNumber: { type: String },
    importerExporterCode: { type: String },
    outletSize: { type: String },

    enableFeedbackModule: { type: String },
    allowRoundOff: { type: String },

    financialYear: { type: String },
    printDateFormat: { type: String },

    decimalPoint: { type: String },

    fssaiNo: { type: String, length: 14 },

    // ******************* Logo *******************
    logo: { type: String },
    waterMark: { type: String },
    reportFormatLogo: { type: String },
    authorizedSignature: { type: String },

    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] }],
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: "role", default: [] }],
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "employee", default: [] }],

    ...baseCommonFields,
  },
  baseSchemaOptions
);

export const companyModel = mongoose.model("company", companySchema);
