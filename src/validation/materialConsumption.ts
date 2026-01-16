import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

const materialConsumptionItemSchema = Joi.object({
  productId: objectId().required(),
  itemCode: Joi.string().allow("", null).optional(),
  uomId: objectId().optional(),
  qty: Joi.number().positive().required(),
  unitPrice: Joi.number().min(0).optional(),
  totalAmount: Joi.number().min(0).optional(),
});

export const addMaterialConsumptionSchema = Joi.object({
  consumptionNo: Joi.string().trim().optional(),
  consumptionDate: Joi.date().required(),
  userId: objectId().optional(),
  branchId: objectId().optional(),
  consumptionType: Joi.string().allow("", null).optional(),
  remark: Joi.string().allow("", null).optional(),
  items: Joi.array().items(materialConsumptionItemSchema).min(1).required(),
  totalAmount: Joi.number().min(0).optional(),
  ...baseApiSchema,
});

export const editMaterialConsumptionSchema = Joi.object({
  materialConsumptionId: objectId().required(),
  consumptionNo: Joi.string().trim().optional(),
  consumptionDate: Joi.date().optional(),
  userId: objectId().optional(),
  branchId: objectId().optional(),
  consumptionType: Joi.string().allow("", null).optional(),
  remark: Joi.string().allow("", null).optional(),
  items: Joi.array().items(materialConsumptionItemSchema).optional(),
  totalAmount: Joi.number().min(0).optional(),
  ...baseApiSchema,
});

export const deleteMaterialConsumptionSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getMaterialConsumptionSchema = Joi.object().keys({
  id: objectId().required(),
});
