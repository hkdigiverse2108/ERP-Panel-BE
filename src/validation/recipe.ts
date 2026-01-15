import Joi from "joi";
import { RECIPE_TYPE } from "../common";
import { objectId } from "./common";

export const addRecipeSchema = Joi.object({
  recipeName: Joi.string().required(),
  companyId: objectId().optional(),
  recipeDate: Joi.date().required(),
  recipeNo: Joi.string().required(),
  recipeType: Joi.string()
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

  finalProducts: Joi.array()
    .items(
      Joi.object({
        productId: objectId().required(),
        mrp: Joi.number().optional(),
        qtyGenerate: Joi.number().positive().required(),
      })
    )
    .min(1)
    .required(),
});

export const editRecipeSchema = Joi.object({
  recipeId: objectId().required(),
  companyId: objectId().optional(),
  recipeNo: Joi.string().optional(),

  recipeName: Joi.string().optional(),
  recipeDate: Joi.date().optional(),
  recipeType: Joi.string()
    .valid(...Object.values(RECIPE_TYPE))
    .optional(),

  rawProducts: Joi.array().items(
    Joi.object({
      productId: objectId().required(),
      mrp: Joi.number().optional(),
      useQty: Joi.number().positive().required(),
    })
  ),

  finalProducts: Joi.array().items(
    Joi.object({
      productId: objectId().required(),
      mrp: Joi.number().optional(),
      qtyGenerate: Joi.number().positive().required(),
    })
  ),
});

export const deleteRecipeSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getRecipeSchema = Joi.object().keys({
  id: objectId().required(),
});
