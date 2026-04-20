import Joi from "joi";
import { objectId } from "./common";

export const getNotificationSchema = Joi.object({
  id: objectId().required(),
});

export const deleteNotificationSchema = Joi.object({
  id: objectId().required(),
});

export const readNotificationSchema = Joi.object({
  id: objectId().required(),
});
