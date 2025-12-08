import Joi from "joi";

export const deleteImageSchema = Joi.object().keys({
  fileUrl: Joi.string().required(),
});
