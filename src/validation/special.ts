import Joi from "joi";
import { objectId } from "./common";

export const addSpecialSchema = Joi.object().keys({
  name: Joi.string().required(),
  price: Joi.number().required(),
  image: Joi.string().allow("", null).optional(),
});

export const editSpecialSchema = Joi.object().keys({
  specialId: objectId().required(),
  name: Joi.string().optional(),
  price: Joi.number().optional(),
  image: Joi.string().allow("", null).optional(),
  isActive: Joi.boolean().optional(),
});


export const getSpecialSchema = Joi.object().keys({
  id: objectId().required(),
});