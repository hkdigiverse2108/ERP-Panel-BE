import Joi from "joi";

export const addAnnouncementSchema = Joi.object().keys({
  companyId: Joi.string().required(),
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.array().items(Joi.string().required()).required(),
});

export const editAnnouncementSchema = Joi.object().keys({
  companyId: Joi.string().required(),
  _id:Joi.string().required(),
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.array().items(Joi.string().required()).required(),
});

export const deleteAnnoucementSchema = Joi.object().keys({
  id: Joi.string().required(),
});

export const getAnnouncementSchema = Joi.object().keys({
  id: Joi.string().required(),
});

