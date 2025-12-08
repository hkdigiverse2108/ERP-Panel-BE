import Joi from "joi";

export const addUserSchema = Joi.object().keys({
  companyId: Joi.string().optional(),
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().required(),
  profileImage: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  isActive: Joi.boolean().optional().default(false),
});

export const editUserSchema = Joi.object().keys({
  userId: Joi.string().required(),
  companyId: Joi.string().optional(),
  fullName: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().optional(),
  profileImage: Joi.string().optional(),
  role: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  isActive: Joi.boolean().optional().default(false),
});

export const deleteUserSchema = Joi.object().keys({
  id: Joi.string().required(),
});

export const getUserSchema = Joi.object().keys({
  id: Joi.string().required(),
});
