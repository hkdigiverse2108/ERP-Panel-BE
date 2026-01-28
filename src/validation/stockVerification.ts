import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { APPROVAL_STATUS } from "../common";

const stockVerificationItemSchema = Joi.object({
  productId: objectId().required(),
  landingCost: Joi.number().min(0).default(0),
  price: Joi.number().min(0).default(0),
  mrp: Joi.number().min(0).default(0),
  sellingPrice: Joi.number().min(0).default(0),
  systemQty: Joi.number().min(0).default(0),
  physicalQty: Joi.number().min(0).required(),
  differenceQty: Joi.number().default(0),
  approvedQty: Joi.number().optional(),

  differenceAmount: Joi.number().default(0),
});

export const addStockVerificationSchema = Joi.object({
  remark: Joi.string().optional(),
  items: Joi.array().items(stockVerificationItemSchema).min(1).required(),

  totalProducts: Joi.number().optional(),
  totalPhysicalQty: Joi.number().optional(),
  totalDifferenceAmount: Joi.number().optional(),
  totalApprovedQty: Joi.number().optional(),

  status: Joi.string()
    .valid(...Object.values(APPROVAL_STATUS))
    .default(APPROVAL_STATUS.PENDING),

  ...baseApiSchema,
});

export const editStockVerificationSchema = Joi.object({
  stockVerificationId: objectId().required(),

  remark: Joi.string().optional(),
  items: Joi.array().items(stockVerificationItemSchema).optional(),

  totalProducts: Joi.number().optional(),
  totalPhysicalQty: Joi.number().optional(),
  totalDifferenceAmount: Joi.number().optional(),
  totalApprovedQty: Joi.number().optional(),

  status: Joi.string()
    .valid(...Object.values(APPROVAL_STATUS))
    .optional(),

  ...baseApiSchema,
});

export const deleteStockVerificationSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getStockVerificationSchema = Joi.object().keys({
  id: objectId().required(),
});
