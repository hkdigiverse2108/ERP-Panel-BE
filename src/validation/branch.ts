import Joi from "joi";
import { objectId } from "./common";

export const addBranchSchema = Joi.object().keys({
  name: Joi.string().required(),
  address: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  companyId: objectId().required(),
});

export const editBranchSchema = Joi.object().keys({
  branchId: objectId().required(),
  companyId: objectId().optional(),
  name: Joi.string().optional(),
  address: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});
export const deleteBranchSchema = Joi.object().keys({
  id: objectId().required(),
});

export const getBranchSchema = Joi.object().keys({
  id: objectId().required(),
});
