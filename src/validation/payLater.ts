import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { PAY_LATER_STATUS } from "../common";

export const addPayLaterSchema = Joi.object({
  customerId: objectId().required(),
  posOrderId: objectId().optional().allow(null),
  totalAmount: Joi.number().min(0).required(),
  paidAmount: Joi.number().min(0).default(0).optional(),
  // dueAmount: Joi.number().min(0).required(),
  // status: Joi.string()
  //   .valid(...Object.values(PAY_LATER_STATUS))
  //   .default(PAY_LATER_STATUS.OPEN)
  //   .optional(),
  dueDate: Joi.date().optional().allow(null),
  note: Joi.string().optional().allow("", null),
  sendReminder: Joi.boolean().default(false).optional(),
  ...baseApiSchema,
});

export const editPayLaterSchema = Joi.object({
  payLaterId: objectId().required(),
  customerId: objectId().optional(),
  posOrderId: objectId().optional().allow(null),
  totalAmount: Joi.number().min(0).optional(),
  paidAmount: Joi.number().min(0).optional(),
  // dueAmount: Joi.number().min(0).optional(),
  // status: Joi.string()
  //   .valid(...Object.values(PAY_LATER_STATUS))
  //   .optional(),
  dueDate: Joi.date().optional().allow(null),
  note: Joi.string().optional().allow("", null),
  sendReminder: Joi.boolean().default(false).optional(),
  ...baseApiSchema,
});

export const getPayLaterSchema = Joi.object({
  id: objectId().required(),
});

export const deletePayLaterSchema = Joi.object({
  id: objectId().required(),
});

export const getAllPayLaterSchema = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
  search: Joi.string().optional().allow("", null),
  customerId: objectId().optional(),
  status: Joi.string()
    .valid(...Object.values(PAY_LATER_STATUS))
    .optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  ...baseApiSchema,
});
