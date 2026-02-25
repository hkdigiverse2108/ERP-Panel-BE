import Joi from "joi";
import { baseApiSchema, objectId } from "./common";


export const createCompanyDriveSchema = Joi.object({
    documentName: Joi.string().required(),
    documentUrl: Joi.string().required(),
    remark: Joi.string().required(),
    ...baseApiSchema,
});

export const editCompanyDriveSchema = Joi.object({
    documentId: objectId().required(),
    documentName: Joi.string().optional(),
    documentUrl: Joi.string().optional(),
    remark: Joi.string().optional(),
    ...baseApiSchema,
});

export const getCompanyDriveSchema = Joi.object({
    id: objectId().required(),
});

export const deleteCompanyDriveSchema = Joi.object({
    id: objectId().required(),
});