import Joi from "joi";
import mongoose from "mongoose";

export const objectId = () =>
  Joi.string().custom((value, helpers) => {
    if (!mongoose?.Types.ObjectId.isValid(value)) {
      return helpers.error("any.invalid");
    }
    return value;
  }, "ObjectId Validation");

export const baseApiSchema = {
  companyId: objectId().optional().allow("", null),
  branchId: objectId().optional().allow("", null),
  locationId: objectId().optional().allow("", null),
  isActive: Joi.boolean().optional(),
};
