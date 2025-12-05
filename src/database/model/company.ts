import { commonFields } from "./commonFields";

const mongoose = require("mongoose");

const companySchema: any = new mongoose.Schema(
  {
    // ******************* Basic Details *******************
    name: { type: String },
    displayName: { type: String },
    contactName: { type: String },
    ownerNo: { type: String },
    email: { type: String },
    supportEmail: { type: String },
    phoneNumber: { type: String },
    customerCareNumber: { type: String },

    // ******************* Communication Details *******************
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    pinCode: { type: String },
    timeZone: { type: String },
    webSite: { type: String },

    // ******************* Bank Details *******************
    bankName: { type: String },
    bankIFSC: { type: String },
    upiId: { type: String },
    branchName: { type: String },
    accountHolderName: { type: String },
    bankAccountNumber: { type: String },

    // ******************* Additional Details *******************
    userName: { type: String },
    PanNo: { type: String },
    GSTRegistrationType: { type: String },
    GSTIdentificationNumber: { type: String },
    financialMonthInterval: { type: String },
    defaultFinancialYear: { type: String },

    // *******************  Other Details *******************
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

    // ******************* Logo *******************
    logo: { type: String },
    waterMark: { type: String },
    reportFormatLogo: { type: String },
    authorizedSignature: { type: String },

    // ******************* Common *******************
    // isDeleted: { type: Boolean, default: false },
    // isBlocked: { type: Boolean, default: false },
    // createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    // updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    ...commonFields,
  },
  { timestamps: true, versionKey: false }
);

export const companyModel = mongoose.model("company", companySchema);
