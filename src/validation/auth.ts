import Joi from "joi";
import { objectId } from "./common";

export const registerSchema = Joi.object().keys({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  profileImage: Joi.string().optional().allow(""),
  role: objectId().required(),
  phoneNo: Joi.string().optional(),
});

export const loginSchema = Joi.object().keys({
  email: Joi.string().required(),
  password: Joi.string().required(),
});
