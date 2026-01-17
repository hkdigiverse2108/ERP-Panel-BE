import Joi from "joi";
import { objectId } from "./common";
import { LOCATION_TYPE } from "../common";

export const addLocationSchema = Joi.object({
  name: Joi.string().trim().required(),
  type: Joi.string()
    .valid(...Object.values(LOCATION_TYPE))
    .required(),
  code: Joi.string().trim().uppercase().optional().allow(""),
  parentId: objectId().optional().allow("", null),

  isActive: Joi.boolean().optional(),
});

export const editLocationSchema = Joi.object({
  locationId: objectId().required(),
  name: Joi.string().trim().optional(),
  type: Joi.string()
    .valid(...Object.values(LOCATION_TYPE))
    .optional(),
  code: Joi.string().trim().uppercase().optional().allow(""),
  parentId: objectId().optional().allow("", null),

  isActive: Joi.boolean().optional(),
});

export const deleteLocationSchema = Joi.object({
  id: objectId().required(),
});

export const getLocationSchema = Joi.object({
  id: objectId().required(),
});

export const getStateByCountrySchema = Joi.object({
  countryId: objectId().required(),
});

export const getCityByStateSchema = Joi.object({
  stateId: objectId().required(),
});
