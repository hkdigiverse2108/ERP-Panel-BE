import Joi from "joi";
import { commonContactSchema, objectId } from "./common";

export const addCompanySchema = Joi.object().keys({
  // ******************* Basic Details *******************
  accountingType: Joi.string().optional(),
  name: Joi.string().required(),
  displayName: Joi.string().required(),
  contactName: Joi.string().required(),
  ownerNo: commonContactSchema.required(),
  supportEmail: Joi.string().required(),
  email: Joi.string().lowercase().required(),
  phoneNo: commonContactSchema.required(),
  customerCareNumber: Joi.string().optional(),

  roles: Joi.array().items(Joi.string()).optional(),
  userIds: Joi.array().items(Joi.string()).optional(),

  // ******************* Communication Details *******************
  address: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().required(),
  pinCode: Joi.number().required(),
  // timeZone: Joi.string().optional(),
  webSite: Joi.string().optional(),

  // ******************* Bank Details *******************
  bankId: objectId().optional(),
  upiId: Joi.string().optional(),
  // accountHolderName: Joi.string().required(),
  // bankAccountNumber: Joi.string().required(),
  // name: Joi.string().required(),
  // bankIFSC: Joi.string().required(),
  // branchName: Joi.string().optional().allow("", null),

  // ******************* Additional Details *******************
  userName: Joi.string().optional(),
  panNo: Joi.string().optional(),
  gstRegistrationType: Joi.string().optional(),
  gstIdentificationNumber: Joi.string().optional(),
  financialMonthInterval: Joi.string().optional(),
  // defaultFinancialYear: Joi.string().optional(),

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

  fssaiNo: Joi.string()
    .pattern(/^\d{14}$/)
    .optional()
    .allow("", null),

  // ******************* Logo *******************
  logo: Joi.string().optional().allow("", null),
  waterMark: Joi.string().optional().allow("", null),
  reportFormatLogo: Joi.string().optional().allow("", null),
  authorizedSignature: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().optional(),
});

export const editCompanySchema = Joi.object().keys({
  companyId: objectId().required(),

  accountingType: Joi.string().optional(),
  name: Joi.string().optional(),
  displayName: Joi.string().optional(),
  contactName: Joi.string().optional(),
  ownerNo: commonContactSchema.optional(),
  supportEmail: Joi.string().optional(),
  email: Joi.string().lowercase().optional(),
  phoneNo: commonContactSchema.optional(),
  customerCareNumber: Joi.string().optional().allow("", null),

  roles: Joi.array().items(Joi.string()).optional(),
  userIds: Joi.array().items(Joi.string()).optional(),

  // ******************* Communication Details *******************
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional(),
  pinCode: Joi.number().optional(),
  // timeZone: Joi.string().optional().allow("", null),
  webSite: Joi.string().optional().allow("", null),

  // ******************* Bank Details *******************
  bankId: objectId().optional(),
  upiId: Joi.string().optional(),
  // accountHolderName: Joi.string().optional(),
  // bankAccountNumber: Joi.string().optional(),
  // name: Joi.string().optional(),
  // bankIFSC: Joi.string().optional(),
  // branchName: Joi.string().optional().allow("", null),

  // ******************* Additional Details *******************
  userName: Joi.string().optional().allow("", null),
  panNo: Joi.string().optional().allow("", null),
  gstRegistrationType: Joi.string().optional().allow("", null),
  gstIdentificationNumber: Joi.string().optional().allow("", null),
  financialMonthInterval: Joi.string().optional().allow("", null),
  // defaultFinancialYear: Joi.string().optional(),

  // *******************  Other Details *******************
  corporateIdentificationNumber: Joi.string().optional().allow("", null),
  letterOfUndertaking: Joi.string().optional().allow("", null),
  taxDeductionAndCollectionAccountNumber: Joi.string().optional().allow("", null),
  importerExporterCode: Joi.string().optional().allow("", null),
  outletSize: Joi.string().optional().allow("", null),

  enableFeedbackModule: Joi.boolean().optional(),
  allowRoundOff: Joi.boolean().optional(),

  financialYear: Joi.string().optional(),
  printDateFormat: Joi.string().optional(),

  decimalPoint: Joi.string().optional(),

  fssaiNo: Joi.string()
    .pattern(/^\d{14}$/)
    .optional()
    .allow("", null),

  // ******************* Logo *******************
  logo: Joi.string().optional().allow("", null),
  waterMark: Joi.string().optional().allow("", null),
  reportFormatLogo: Joi.string().optional().allow("", null),
  authorizedSignature: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().optional(),
});

export const deleteCompanySchema = Joi.object().keys({
  id: objectId().required(),
});

export const getCompanySchema = Joi.object().keys({
  id: objectId().required(),
});
