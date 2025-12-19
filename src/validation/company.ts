import Joi from "joi";
import { objectId } from "./common";

export const addCompanySchema = Joi.object().keys({
  // ******************* Basic Details *******************
  name: Joi.string().optional(),
  displayName: Joi.string().optional(),
  contactName: Joi.string().optional(),
  userIds: Joi.array().items(Joi.string()).optional(),
  employees: Joi.array().items(Joi.string()).optional(),
  roles: Joi.array().items(Joi.string()).optional(),
  ownerNo: Joi.string().optional(),
  email: Joi.string().optional(),
  supportEmail: Joi.string().optional(),
  phoneNo: Joi.string().optional(),
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
  branch: Joi.array().items(Joi.string().optional()).optional(),
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
  logo: Joi.string().optional().allow(""),
  waterMark: Joi.string().optional().allow(""),
  reportFormatLogo: Joi.string().optional().allow(""),
  authorizedSignature: Joi.string().optional().allow(""),
});

export const editCompanySchema = Joi.object().keys({
  companyId: objectId().required(),
  // ******************* Basic Details *******************
  name: Joi.string().optional(),
  displayName: Joi.string().optional(),
  contactName: Joi.string().optional(),
  userIds: Joi.array().items(Joi.string()).optional(),
  roles: Joi.array().items(Joi.string()).optional(),
  employees: Joi.array().items(Joi.string()).optional(),
  ownerNo: Joi.string().optional(),
  email: Joi.string().optional(),
  supportEmail: Joi.string().optional(),
  phoneNo: Joi.string().optional(),
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
  branch: Joi.array().items(Joi.string().optional()).optional(),
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
  logo: Joi.string().optional().allow(""),
  waterMark: Joi.string().optional().allow(""),
  reportFormatLogo: Joi.string().optional().allow(""),
  authorizedSignature: Joi.string().optional().allow(""),
});

export const deleteCompanySchema = Joi.object().keys({
  id: objectId().required(),
});

export const getCompanySchema = Joi.object().keys({
  id: objectId().required(),
});
