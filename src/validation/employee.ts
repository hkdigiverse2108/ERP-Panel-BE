import Joi from "joi";

export const addEmployeeSchema = Joi.object().keys({
    id: Joi.string().required(),
    name: Joi.string().required(),
    companyId: Joi.string().optional(),
    branch: Joi.string().optional(),
    email: Joi.string().optional(),
    mobileNo: Joi.string().required(),
    address: {
        address: Joi.string().optional(),
        country: Joi.string().required(),
        state: Joi.string().required(),
        city: Joi.string().required(),
        postalCode: Joi.string().optional(),
    },
    bankDetiails: {
        bankHolderName: Joi.string().optional(),
        bankName: Joi.string().optional(),
        branch: Joi.string().optional(),
        accountNumber: Joi.string().optional(),
        IFSCCode: Joi.string().optional(),
        swiftCode: Joi.string().optional(),
    },
    panNumber: Joi.string().optional(),
    wages: Joi.number().optional(),
    commission: Joi.number().optional(),
    extraWages: Joi.number().optional(),
    target: Joi.number().optional(),
});

export const editEmployeeSchema = Joi.object().keys({
    id: Joi.string().required(),
    name: Joi.string().optional(),
    companyId:Joi.string().optional(),
    email: Joi.string().optional(),
    mobileNo: Joi.string().optional(),
    address: {
        address: Joi.string().optional(),
        country: Joi.string().optional(),
        state: Joi.string().optional(),
        city: Joi.string().optional(),
        postalCode: Joi.string().optional(),
    },
    bankDetiails: {
        bankHolderName: Joi.string().optional(),
        bankName: Joi.string().optional(),
        branch: Joi.string().optional(),
        accountNumber: Joi.string().optional(),
        IFSCCode: Joi.string().optional(),
        swiftCode: Joi.string().optional(),
    },
    branch: Joi.string().optional(),
    PanNumber: Joi.string().optional(),
    wages: Joi.number().optional(),
    commission: Joi.number().optional(),
    extraWages: Joi.number().optional(),
    target: Joi.number().optional(),
});

export const deleteEmployeeSchema = Joi.object().keys({
    id: Joi.string().required(),
});

export const getEmployeeSchema = Joi.object().keys({
    id: Joi.string().required(),
});

