import Joi from "joi";
import { objectId, baseApiSchema } from "./common";

const templateComponentSchema = Joi.object({
  type: Joi.string().valid("HEADER", "BODY", "FOOTER", "BUTTONS").required(),
  format: Joi.string().optional().allow("", null),
  text: Joi.string().optional().allow("", null),
  buttons: Joi.array().items(Joi.object()).optional(),
  example: Joi.object().optional(),
});

export const upsertMetaWhatsAppAccountSchema = Joi.object({
  accountId: objectId().optional().allow("", null),
  businessAccountId: Joi.string().required(),
  phoneNumberId: Joi.string().required(),
  displayPhoneNumber: Joi.string().optional().allow("", null),
  accessToken: Joi.string().required(),
  graphVersion: Joi.string().optional().allow("", null),
  isDefault: Joi.boolean().optional(),
  ...baseApiSchema,
});

export const createMetaTemplateSchema = Joi.object({
  accountId: objectId().required(),
  name: Joi.string().lowercase().required(),
  language: Joi.string().default("en_US"),
  category: Joi.string().valid("UTILITY", "MARKETING", "AUTHENTICATION").default("UTILITY"),
  components: Joi.array().items(templateComponentSchema).min(1).required(),
  useFor: Joi.string().valid("POS_BILL", "CONTACT_BULK", "INVOICE", "CUSTOM").default("CUSTOM"),
  sendAttachment: Joi.boolean().optional().default(false),
  attachmentType: Joi.string().valid("pdf", "image", "document", "none").optional().default("pdf"),
  companyIds: Joi.array().items(objectId()).optional().default([]),
  ...baseApiSchema,
});

export const sendPosBillWhatsAppSchema = Joi.object({
  posOrderId: objectId().required(),
  templateId: objectId().optional().allow("", null),
});

export const bulkSendContactWhatsAppSchema = Joi.object({
  templateId: objectId().required(),
  contactIds: Joi.array().items(objectId()).min(1).required(),
  sourceType: Joi.string().valid("CONTACT_BULK", "CUSTOM").default("CONTACT_BULK"),
  variables: Joi.object().optional().default({}),
});

export const getMetaTemplatesSchema = Joi.object().keys({
  page: Joi.number().optional(),
  limit: Joi.number().optional(),
  search: Joi.string().optional().allow("", null),
  status: Joi.string().optional().allow("", null),
  useFor: Joi.string().optional().allow("", null),
});

export const getMetaLogsSchema = Joi.object().keys({
  page: Joi.number().optional(),
  limit: Joi.number().optional(),
  search: Joi.string().optional().allow("", null),
  status: Joi.string().optional().allow("", null),
  sourceType: Joi.string().optional().allow("", null),
});
