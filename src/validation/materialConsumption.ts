import Joi from "joi";
import { baseApiSchema, objectId } from "./common";
import { CONSUMPTION_TYPE } from "../common";

const materialConsumptionItemSchema = Joi.object({
  productId: objectId().required(),
  qty: Joi.number().positive().optional(),
  price: Joi.number().min(0).optional().default(0),
  totalPrice: Joi.number().min(0).optional().default(0),
});

export const addMaterialConsumptionSchema = Joi.object({
  ...baseApiSchema,
  number: Joi.string().trim().optional(),
  date: Joi.date().required(),
  type: Joi.string()
    .valid(...Object.values(CONSUMPTION_TYPE))
    .default(CONSUMPTION_TYPE.PRODUCTION),
  remark: Joi.string().allow("", null).optional(),
  items: Joi.array().items(materialConsumptionItemSchema).min(1).required(),
  totalQty: Joi.number().min(0).optional(),
  totalAmount: Joi.number().min(0).optional(),
});

export const editMaterialConsumptionSchema = Joi.object({
  ...baseApiSchema,
  materialConsumptionId: objectId().required(), // used to find the document
  number: Joi.string().trim().optional(),
  date: Joi.date().optional(),
  type: Joi.string()
    .valid(...Object.values(CONSUMPTION_TYPE))
    .default(CONSUMPTION_TYPE.PRODUCTION),
  remark: Joi.string().allow("", null).optional(),
  items: Joi.array().items(materialConsumptionItemSchema).optional(),
  totalQty: Joi.number().min(0).optional(),
  totalAmount: Joi.number().min(0).optional(),
});

export const deleteMaterialConsumptionSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getMaterialConsumptionSchema = Joi.object().keys({
  id: objectId().required(),
});
