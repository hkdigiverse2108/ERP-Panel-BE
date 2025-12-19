import Joi from "joi";

export const registerSchema = Joi.object().keys({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  profileImage: Joi.string().optional().allow(""),
  role: Joi.string().required(),
  phoneNo: Joi.string().optional(),
});

export const loginSchema = Joi.object().keys({
  email: Joi.string().required(),
  password: Joi.string().required(),
});
