import Joi from "joi";
import { RECIPE_TYPE } from "../common";
import { baseApiSchema, objectId } from "./common";

export const addRecipeSchema = Joi.object({
  ...baseApiSchema,
  name: Joi.string().required(),
  date: Joi.date().required(),
  number: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(RECIPE_TYPE))
    .required(),

  rawProducts: Joi.array()
    .items(
      Joi.object({
        productId: objectId().required(),
        mrp: Joi.number().optional(),
        useQty: Joi.number().positive().required(),
      })
    )
    .min(1)
    .required(),

  finalProducts: Joi.object({
    productId: objectId().required(),
    mrp: Joi.number().optional(),
    qtyGenerate: Joi.number().positive().required(),
  }).required(),
});

export const editRecipeSchema = Joi.object({
  recipeId: objectId().required(),
  ...baseApiSchema,
  number: Joi.string().optional(),

  name: Joi.string().optional(),
  date: Joi.date().optional(),
  type: Joi.string()
    .valid(...Object.values(RECIPE_TYPE))
    .optional(),

  rawProducts: Joi.array().items(
    Joi.object({
      productId: objectId().required(),
      mrp: Joi.number().optional(),
      useQty: Joi.number().positive().required(),
    })
  ),

  finalProducts: Joi.object({
    productId: objectId().required(),
    mrp: Joi.number().optional(),
    qtyGenerate: Joi.number().positive().required(),
  }),
});

export const deleteRecipeSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getRecipeSchema = Joi.object().keys({
  id: objectId().required(),
});
