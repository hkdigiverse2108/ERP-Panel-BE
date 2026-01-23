import Joi from "joi";
import { commonContactSchema, objectId } from "./common";
import { LOGIN_SOURCES, USER_TYPES } from "../common";

export const registerSchema = Joi.object().keys({
  fullName: Joi.string().required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
  profileImage: Joi.string().optional().allow(""),
  role: objectId().optional(),
  userType: Joi.string()
    .valid(...Object.values(USER_TYPES))
    .required(),
  phoneNo: commonContactSchema.optional(),
});

export const loginSchema = Joi.object().keys({
  email: Joi.string().lowercase().required(),
  password: Joi.string().required(),
  loginSource: Joi.string()
    .valid(...Object.values(LOGIN_SOURCES))
    .required(),
});
