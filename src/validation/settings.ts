import Joi from "joi";

export const settingsLinkSchema = Joi.object({
  title: Joi.string(),
  link: Joi.string().uri(),
  icon: Joi.string(),
  isActive: Joi.boolean().default(true),
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
  links: Joi.array().items(settingsLinkSchema).optional(),
  reportFormats: Joi.array()
    .items(
      Joi.object({
        type: Joi.string(),
        formats: Joi.array().items(
          Joi.object({
            name: Joi.string(),
            isSelected: Joi.boolean(),
            isActive: Joi.boolean().default(true),
          }),
        ),
      }),
    )
    .optional(),
});

export const addReportFormatValidation = Joi.object({
  type: Joi.string().required(),
  formats: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        isSelected: Joi.boolean().default(false),
        isActive: Joi.boolean().default(true),
      }),
    )
    .required(),
});

export const updateReportFormatValidation = Joi.object({
  reportFormatId: Joi.string().required(),
  type: Joi.string().optional(),
  formats: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        isSelected: Joi.boolean().required(),
        isActive: Joi.boolean().default(true),
        _id: Joi.string().optional(),
      }),
    )
    .optional(),
});
