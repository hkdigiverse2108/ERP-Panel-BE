import { apiResponse, HTTP_STATUS } from "../../common";
import { ExpenseModel } from "../../database";
import { checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, applyDateFilter } from "../../helper";
import { addExpenseSchema, deleteExpenseSchema, editExpenseSchema, getExpenseSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addExpense = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req.headers;
        const { error, value } = addExpenseSchema.validate(req.body);

        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

        value.companyId = await checkCompany(user, value);
        value.isSalery = false;
        value.createdBy = user?._id || null;
        value.updatedBy = user?._id || null;

        const response = await createOne(ExpenseModel, value);

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
        }

        return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Expense"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getAllExpense = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;

        let {
            page,
            limit,
            search,
            startDate,
            endDate,
            companyFilter,
            typeFilter,
            avoidSalery
        } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        let criteria: any = { isDeleted: false };

        // company filter
        if (companyId) criteria.companyId = companyId;
        if (companyFilter) criteria.companyId = companyFilter;

        // type filter
        if (typeFilter) criteria.type = typeFilter;

        // avoid salary filter
        if (avoidSalery === "true") {
            criteria.isSalery = false;
        }

        // search
        if (search) {
            criteria.$or = [
                { discreption: { $regex: search, $options: "i" } },
                { type: { $regex: search, $options: "i" } }
            ];
        }

        // date filter
        applyDateFilter(criteria, startDate as string, endDate as string);

        const options: any = {
            sort: { createdAt: -1 },
            skip: (page - 1) * limit,
            limit: limit,
            populate: [
                { path: "companyId", select: "name" }
            ]
        };

        // fetch data
        const response = await getDataWithSorting(ExpenseModel, criteria, {}, options);

        // dynamic populate based on salary
        await Promise.all(
            response.map(async (item) => {
                await item.populate({
                    path: "partyId",
                    model: item.isSalery ? "user" : "contact",
                    select: item.isSalery
                        ? "fullName"
                        : "firstName lastName companyName"
                });
            })
        );

        // total count
        const totalData = await countData(ExpenseModel, criteria);

        const totalPages = Math.ceil(totalData / limit) || 1;

        const state = {
            page,
            limit,
            totalPages
        };

        return res.status(HTTP_STATUS.OK).json(
            new apiResponse(
                HTTP_STATUS.OK,
                responseMessage?.getDataSuccess("Expense"),
                {
                    expense_data: response,
                    totalData,
                    state
                },
                {}
            )
        );

    } catch (error) {
        console.error(error);

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
            new apiResponse(
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                responseMessage?.internalServerError,
                {},
                error
            )
        );
    }
};

export const getExpenseById = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getExpenseSchema.validate(req.params);

        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

        const response = await getFirstMatch(
            ExpenseModel,
            { _id: value.id, isDeleted: false, isSalery: false },
            {},
            {
                populate: [
                    { path: "companyId", select: "name" },
                    { path: "partyId", model: "contact", select: "firstName lastName companyName" },
                ],
            },
        );

        if (!response) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Expense"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Expense"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const editExpenseById = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req.headers;
        const { error, value } = editExpenseSchema.validate(req.body);

        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

        value.updatedBy = user?._id || null;

        const response = await updateData(ExpenseModel, { _id: new ObjectId(value.expenseId), isDeleted: false, isSalery: false }, value, {});

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Expense"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Expense"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const deleteExpenseById = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req.headers;
        const { error, value } = deleteExpenseSchema.validate(req.params);

        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error.details[0].message, {}, {}));

        const expense = await getFirstMatch(ExpenseModel, { _id: value.id, isDeleted: false, isSalery: false }, {}, {});

        if (!expense) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Expense"), {}, {}));
        }

        const response = await updateData(ExpenseModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Expense"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};
