import Joi from "joi";
import { objectId } from "./common";

export const addEmployeeSchema = Joi.object({
    name: Joi.string().required(),
    companyId: objectId().optional(),
    branch: objectId().optional(),
    email: Joi.string().email().optional(),
    mobileNo: Joi.string().required(),
    username: Joi.string().required(),

    address: Joi.object({
        address: Joi.string().optional(),
        country: Joi.string().required(),
        state: Joi.string().required(),
        city: Joi.string().required(),
        postalCode: Joi.string().optional(),
    }).required(),

    bankDetails: Joi.object({
        bankHolderName: Joi.string().optional(),
        bankName: Joi.string().optional(),
        branch: Joi.string().optional(),
        accountNumber: Joi.string().optional(),
        IFSCCode: Joi.string().optional(),
        swiftCode: Joi.string().optional(),
    }).optional(),

    panNumber: Joi.string().optional(),
    wages: Joi.number().optional(),
    commission: Joi.number().optional(),
    extraWages: Joi.number().optional(),
    target: Joi.number().optional(),
});

export const editEmployeeSchema = Joi.object({
    id: objectId().required(),

    name: Joi.string().optional(),
    companyId: objectId().optional(),
    branch: objectId().optional(),
    email: Joi.string().email().optional(),
    mobileNo: Joi.string().optional(),

    address: Joi.object({
        address: Joi.string().optional(),
        country: Joi.string().optional(),
        state: Joi.string().optional(),
        city: Joi.string().optional(),
        postalCode: Joi.string().optional(),
    }).optional(),

    bankDetails: Joi.object({
        bankHolderName: Joi.string().optional(),
        bankName: Joi.string().optional(),
        branch: Joi.string().optional(),
        accountNumber: Joi.string().optional(),
        IFSCCode: Joi.string().optional(),
        swiftCode: Joi.string().optional(),
    }).optional(),

    panNumber: Joi.string().optional(),
    wages: Joi.number().optional(),
    commission: Joi.number().optional(),
    extraWages: Joi.number().optional(),
    target: Joi.number().optional(),
});


export const deleteEmployeeSchema = Joi.object({
    id: objectId().required(),
});

export const getEmployeeSchema = Joi.object({
    id: objectId().required(),
});
