import Joi from "joi";

export const announcementSchema = Joi.object().keys({
  companyId: Joi.string().required(),
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.array().items(Joi.string().required()).required(),
});

export const announcementUpdateSchema = Joi.object().keys({
  companyId: Joi.string().required(),
  _id:Joi.string().required(),
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.array().items(Joi.string().required()).required(),
});