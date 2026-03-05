import Joi from "joi";
import { objectId } from "./common";

export const addFeedbackSchema = Joi.object().keys({
  orderId: objectId().optional().allow("", null),
  customerId: objectId().optional().allow("", null),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().optional().allow("", null),
  isRecommended: Joi.boolean().default(false).optional(),
});

export const editFeedbackSchema = Joi.object().keys({
  feedbackId: objectId().required(),
  orderId: objectId().optional().allow("", null),
  customerId: objectId().optional().allow("", null),
  rating: Joi.number().min(1).max(5).optional(),
  comment: Joi.string().optional().allow("", null),
  isRecommended: Joi.boolean().optional(),
});

export const deleteFeedbackSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getFeedbackSchema = Joi.object().keys({
  id: objectId().required(),
});

