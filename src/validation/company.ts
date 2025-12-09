import Joi from "joi";

export const addCompanySchema = Joi.object().keys({
  // ******************* Basic Details *******************
  name: Joi.string().optional(),
  displayName: Joi.string().optional(),
  contactName: Joi.string().optional(),
  ownerNo: Joi.string().optional(),
  email: Joi.string().optional(),
  supportEmail: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  customerCareNumber: Joi.string().optional(),

  // ******************* Communication Details *******************
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional(),
  pinCode: Joi.number().optional(),
  timeZone: Joi.string().optional(),
  webSite: Joi.string().optional(),

  // ******************* Bank Details *******************
  bankName: Joi.string().optional(),
  bankIFSC: Joi.string().optional(),
  upiId: Joi.string().optional(),
  branchName: Joi.string().optional(),
  accountHolderName: Joi.string().optional(),
  bankAccountNumber: Joi.string().optional(),

  // ******************* Additional Details *******************
  userName: Joi.string().optional(),
  PanNo: Joi.string().optional(),
  GSTRegistrationType: Joi.string().optional(),
  GSTIdentificationNumber: Joi.string().optional(),
  financialMonthInterval: Joi.string().optional(),
  defaultFinancialYear: Joi.string().optional(),

  // *******************  Other Details *******************
  corporateIdentificationNumber: Joi.string().optional(),
  letterOfUndertaking: Joi.string().optional(),
  taxDeductionAndCollectionAccountNumber: Joi.string().optional(),
  importerExporterCode: Joi.string().optional(),
  outletSize: Joi.string().optional(),

  enableFeedbackModule: Joi.boolean().optional(),
  allowRoundOff: Joi.boolean().optional(),

  financialYear: Joi.string().optional(),
  printDateFormat: Joi.string().optional(),

  decimalPoint: Joi.string().optional(),

  // ******************* Logo *******************
  logo: Joi.string().optional(),
  waterMark: Joi.string().optional(),
  reportFormatLogo: Joi.string().optional(),
  authorizedSignature: Joi.string().optional(),
});

export const editCompanySchema = Joi.object().keys({
  companyId: Joi.string().required(),
  // ******************* Basic Details *******************
  name: Joi.string().optional(),
  displayName: Joi.string().optional(),
  contactName: Joi.string().optional(),
  ownerNo: Joi.string().optional(),
  email: Joi.string().optional(),
  supportEmail: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  customerCareNumber: Joi.string().optional(),

  // ******************* Communication Details *******************
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional(),
  pinCode: Joi.number().optional(),
  timeZone: Joi.string().optional(),
  webSite: Joi.string().optional(),

  // ******************* Bank Details *******************
  bankName: Joi.string().optional(),
  bankIFSC: Joi.string().optional(),
  upiId: Joi.string().optional(),
  branchName: Joi.string().optional(),
  accountHolderName: Joi.string().optional(),
  bankAccountNumber: Joi.string().optional(),

  // ******************* Additional Details *******************
  userName: Joi.string().optional(),
  PanNo: Joi.string().optional(),
  GSTRegistrationType: Joi.string().optional(),
  GSTIdentificationNumber: Joi.string().optional(),
  financialMonthInterval: Joi.string().optional(),
  defaultFinancialYear: Joi.string().optional(),

  // ******************* Other Details *******************
  corporateIdentificationNumber: Joi.string().optional(),
  letterOfUndertaking: Joi.string().optional(),
  taxDeductionAndCollectionAccountNumber: Joi.string().optional(),
  importerExporterCode: Joi.string().optional(),
  outletSize: Joi.string().optional(),

  enableFeedbackModule: Joi.boolean().optional(),
  allowRoundOff: Joi.boolean().optional(),

  financialYear: Joi.string().optional(),
  printDateFormat: Joi.string().optional(),

  decimalPoint: Joi.string().optional(),

  // ******************* Logo *******************
  logo: Joi.string().optional(),
  waterMark: Joi.string().optional(),
  reportFormatLogo: Joi.string().optional(),
  authorizedSignature: Joi.string().optional(),
});

export const deleteCompanySchema = Joi.object().keys({
  id: Joi.string().required(),
});

export const getCompanySchema = Joi.object().keys({
  id: Joi.string().required(),
});

