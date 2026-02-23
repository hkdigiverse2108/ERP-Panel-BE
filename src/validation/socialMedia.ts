import Joi from "joi";

export const socialMediaLinkSchema = Joi.object({
    title: Joi.string().required(),
    link: Joi.string().uri().required(),
    icon: Joi.string().required(),
    status: Joi.boolean().default(true)
});

export const updateSocialMediaValidation = Joi.object({
    links: Joi.array().items(socialMediaLinkSchema).required()
});
