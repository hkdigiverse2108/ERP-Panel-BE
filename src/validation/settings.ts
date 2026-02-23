import Joi from "joi";

export const settingsLinkSchema = Joi.object({
    title: Joi.string().required(),
    link: Joi.string().uri().required(),
    icon: Joi.string().required(),
    isActive: Joi.boolean().default(true)
});

export const updateSettingsValidation = Joi.object({
    logo: Joi.string().allow(null, ""),
    favicon: Joi.string().allow(null, ""),
    themeImage: Joi.string().allow(null, ""),
    phoneNo: Joi.object({
        countryCode: Joi.string().allow(null, ""),
        phoneNo: Joi.number().allow(null),
    }).allow(null),
    email: Joi.string().email().allow(null, ""),
    address: Joi.string().allow(null, ""),
    workingHours: Joi.object({
        startTime: Joi.string().allow(null, ""),
        endTime: Joi.string().allow(null, ""),
        timezone: Joi.string().allow(null, ""),
    }).allow(null),
    links: Joi.array().items(settingsLinkSchema).optional()
});
