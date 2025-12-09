import Joi from "joi";

export const addBranchSchema = Joi.object().keys({
  name: Joi.string().required(),
  address: Joi.string().optional(),
});

export const editBranchSchema = Joi.object().keys({
  id: Joi.string().required(),
  name: Joi.string().optional(),
  address: Joi.string().optional(),
});

export const deleteBranchSchema = Joi.object().keys({
  id: Joi.string().required(),
});

export const getBranchSchema = Joi.object().keys({
  id: Joi.string().required(),
});

