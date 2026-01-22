import Joi from "joi";
import { objectId } from "./common";

export const addAnnouncementSchema = Joi.object().keys({
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.array().items(Joi.string().required()).required(),
  isActive: Joi.boolean().optional(),
});

export const editAnnouncementSchema = Joi.object().keys({
  id: objectId().required(),
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.array().items(Joi.string().required()).required(),
  isActive: Joi.boolean().optional(),

});

export const deleteAnnouncementSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getAnnouncementSchema = Joi.object().keys({
  id: objectId().required(),
});
