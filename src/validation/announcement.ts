import Joi from "joi";
import { objectId } from "./common";

export const addAnnouncementSchema = Joi.object().keys({
  companyId: objectId().required(),
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.array().items(Joi.string().required()).required(),
});

export const editAnnouncementSchema = Joi.object().keys({
  companyId: objectId().required(),
  id: objectId().required(),
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.array().items(Joi.string().required()).required(),
});

export const deleteAnnouncementSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getAnnouncementSchema = Joi.object().keys({
  id: objectId().required(),
});
