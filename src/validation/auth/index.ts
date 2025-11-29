import Joi from "joi";

export const RegisterSchema = Joi.object().keys({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  phone: Joi.string().optional(),
  agreeTerms: Joi.boolean().default(false),
});
