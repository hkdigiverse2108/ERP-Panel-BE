import { apiResponse, HTTP_STATUS } from "../../common";
import { ExpenseModel } from "../../database";
import { checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter } from "../../helper";
import { addSalarySchema, deleteSalarySchema, editSalarySchema, getSalarySchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addSalary = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req.headers;
        const { error, value } = addSalarySchema.validate(req.body);

        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

        value.companyId = await checkCompany(user, value);
        value.isSalary = true;
        value.createdBy = user?._id || null;
        value.updatedBy = user?._id || null;

        const response = await createOne(ExpenseModel, value);

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
        }

        return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Salary"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getAllSalary = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;

        let { page, limit, search, startDate, endDate, companyFilter } = req.query;

        let criteria: any = { isDeleted: false, isSalary: true };

        if (companyId) {
            criteria.companyId = companyId;
        }

        if (companyFilter) {
            criteria.companyId = companyFilter;
        }

        if (search) {
            criteria.$or = [
                { description: { $regex: search, $options: "si" } },
                { type: { $regex: search, $options: "si" } }
            ];
        }

        applyDateFilter(criteria, startDate as string, endDate as string);

        const options: any = {
            sort: { createdAt: -1 },
            populate: [
                { path: "companyId", select: "name" },
                { path: "partyId", model: "user", select: "fullName" }, // PartyId refers to Employee in Salary
                { path: "createdBy", select: "fullName userType" },
                { path: "updatedBy", select: "fullName userType" },
            ],
        };

        if (page && limit) {
            options.skip = (parseInt(page) - 1) * parseInt(limit);
            options.limit = parseInt(limit);
        }

        const response = await getDataWithSorting(ExpenseModel, criteria, {}, options);
        const totalData = await countData(ExpenseModel, criteria);

        const totalPages = Math.ceil(totalData / limit) || 1;

        const state = {
            page,
            limit,
            totalPages,
        };

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Salary"), { salary_data: response, totalData, state }, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const getSalaryById = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getSalarySchema.validate(req.params);

        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

        const response = await getFirstMatch(
            ExpenseModel,
            { _id: value.id, isDeleted: false, isSalary: true },
            {},
            {
                populate: [
                    { path: "companyId", select: "name" },
                    { path: "partyId", model: "user", select: "name" },
                    { path: "createdBy", select: "fullName userType" },
                    { path: "updatedBy", select: "fullName userType" },
                ],
            },
        );

        if (!response) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Salary"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Salary"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const editSalaryById = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req.headers;
        const { error, value } = editSalarySchema.validate(req.body);

        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

        await checkCompany(user, value);

        value.updatedBy = user?._id || null;

        const response = await updateData(ExpenseModel, { _id: new ObjectId(value.salaryId), isDeleted: false, isSalary: true }, value, {});

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Salary"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Salary"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const deleteSalaryById = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req.headers;
        const { error, value } = deleteSalarySchema.validate(req.params);

        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

        const salary = await getFirstMatch(ExpenseModel, { _id: value.id, isDeleted: false, isSalary: true }, {}, {});

        if (!salary) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Salary"), {}, {}));
        }

        const response = await updateData(ExpenseModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Salary"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};
