import Joi from "joi";
import { objectId } from "./common";

export const addAnnouncementSchema = Joi.object().keys({
  version: Joi.string().required(),
  link: Joi.string().optional(),
  desc: Joi.string().required(),
  isActive: Joi.boolean().optional(),
});

export const editAnnouncementSchema = Joi.object().keys({
  announcementId: objectId().required(),
  version: Joi.string().optional().allow("", null),
  link: Joi.string().optional().allow("", null),
  desc: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});

export const deleteAnnouncementSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getAnnouncementSchema = Joi.object().keys({
  id: objectId().required(),
});
