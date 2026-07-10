import Joi from "joi";
import { objectId, baseApiSchema } from "./common";
import {
  MESSENGER_TEMPLATE_CATEGORY,
  MESSENGER_TEMPLATE_STATUS,
  MESSENGER_TEMPLATE_HEADER_FORMAT,
  MESSENGER_BUTTON_TYPE,
  MESSENGER_TRIGGER_EVENT,
} from "../common";

export const addMessengerConfigSchema = Joi.object({
  pageId: Joi.string().required(),
  pageAccessToken: Joi.string().required(),
  appSecret: Joi.string().required(),
  verifyToken: Joi.string().required(),
  isConnected: Joi.boolean().optional(),
  ...baseApiSchema,
});

export const addMessengerTemplateSchema = Joi.object({
  name: Joi.string().required(),
  language: Joi.string().required(),
  category: Joi.string().valid(...Object.values(MESSENGER_TEMPLATE_CATEGORY)).default(MESSENGER_TEMPLATE_CATEGORY.UTILITY),
  parameterFormat: Joi.string().valid("NAMED", "POSITIONAL").default("NAMED"),
  header: Joi.object({
    format: Joi.string().valid(...Object.values(MESSENGER_TEMPLATE_HEADER_FORMAT)).default(MESSENGER_TEMPLATE_HEADER_FORMAT.NONE),
    text: Joi.string().optional().allow("", null),
    imageHandle: Joi.string().optional().allow("", null),
  }).optional().default({ format: "NONE" }),
  bodyText: Joi.string().required(),
  variables: Joi.array().items(Joi.object({
    paramName: Joi.string().required(),
    exampleValue: Joi.string().required(),
  })).optional().default([]),
  buttons: Joi.array().items(Joi.object({
    type: Joi.string().valid(...Object.values(MESSENGER_BUTTON_TYPE)).required(),
    text: Joi.string().required(),
    url: Joi.string().uri().optional().allow("", null),
    phoneNumber: Joi.string().optional().allow("", null),
    payload: Joi.string().optional().allow("", null),
  })).max(3).optional().default([]),
  ...baseApiSchema,
});

export const deleteMessengerTemplateSchema = Joi.object().keys({
  id: objectId().required(),
});

export const refreshMessengerTemplateSchema = Joi.object({
  id: objectId().optional(),
});

export const sendMessengerMessageSchema = Joi.object({
  contactId: objectId().required(),
  templateId: objectId().required(),
  variableValues: Joi.object().pattern(Joi.string(), Joi.string()).optional().default({}),
  referenceType: Joi.string().optional().allow("", null),
  referenceId: Joi.string().optional().allow("", null),
});

export const getMessengerLogSchema = Joi.object().keys({
  contactId: objectId().optional(),
});

export const uploadMessengerImageSchema = Joi.object({
  image: Joi.any().optional(),
});
