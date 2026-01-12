import Joi from "joi";
import { baseApiSchema, objectId } from "./common";

export const addMaterialSchema = Joi.object({
  materialNo: Joi.string().trim().optional(),

  materialDate: Joi.date().required(),

  description: Joi.string().allow("", null).optional(),

  materialTaken: Joi.array()
    .items(
      Joi.object({
        productId: objectId().required(),
        qty: Joi.number().positive().required(),
        mrp: Joi.number().min(0).optional(),
        unitCost: Joi.number().min(0).required(),
        landingPrice: Joi.number().min(0).optional(),
        salesRate: Joi.number().min(0).optional(),
        taxRate: Joi.number().min(0).max(100).optional(),
        totalAmount: Joi.number().min(0).required(),
      })
    )
    .default([]),

  materialTakenTotalAmount: Joi.number().min(0).default(0),

  goodsReceived: Joi.array()
    .items(
      Joi.object({
        productId: objectId().required(),
        qty: Joi.number().positive().required(),
        mrp: Joi.number().min(0).optional(),
        batch: Joi.string().optional(),
        unitCost: Joi.number().min(0).required(),
        landingPrice: Joi.number().min(0).optional(),
        salesRate: Joi.number().min(0).optional(),
        taxRate: Joi.number().min(0).max(100).optional(),
        totalAmount: Joi.number().min(0).required(),
      })
    )
    .default([]),

  goodsReceivedTotalAmount: Joi.number().min(0).default(0),
  ...baseApiSchema,
});

export const editMaterialSchema = Joi.object({
  materialId: objectId().required(),

  materialNo: Joi.string().trim().optional(),

  materialDate: Joi.date().optional(),

  description: Joi.string().allow("", null).optional(),

  materialTaken: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().optional(),
        qty: Joi.number().positive().optional(),
        mrp: Joi.number().min(0).optional(),
        unitCost: Joi.number().min(0).optional(),
        landingPrice: Joi.number().min(0).optional(),
        salesRate: Joi.number().min(0).optional(),
        taxRate: Joi.number().min(0).max(100).optional(),
        totalAmount: Joi.number().min(0).optional(),
      })
    )
    .default([]),

  materialTakenTotalAmount: Joi.number().min(0).default(0),

  goodsReceived: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().optional(),
        qty: Joi.number().positive().optional(),
        mrp: Joi.number().min(0).optional(),
        batch: Joi.string().optional(),
        unitCost: Joi.number().min(0).optional(),
        landingPrice: Joi.number().min(0).optional(),
        salesRate: Joi.number().min(0).optional(),
        taxRate: Joi.number().min(0).max(100).optional(),
        totalAmount: Joi.number().min(0).optional(),
      })
    )
    .default([]),

  goodsReceivedTotalAmount: Joi.number().min(0).default(0),

  ...baseApiSchema,
});

export const deleteMaterialSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getMaterialSchema = Joi.object().keys({
  id: objectId().required(),
});
