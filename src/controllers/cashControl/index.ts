import { CashControlModel, PosCashRegisterModel, branchModel } from "../../database";
import { apiResponse, HTTP_STATUS, CASH_REGISTER_STATUS } from "../../common";
import {
    checkCompany,
    checkIdExist,
    createOne,
    getFirstMatch,
    updateData,
    reqInfo,
    countData,
    getDataWithSorting,
    responseMessage,
    getData
} from "../../helper";
import {
    addCashControlSchema,
    editCashControlSchema,
    getCashControlSchema,
    deleteCashControlSchema,
} from "../../validation";

export const addCashControl = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = addCashControlSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        value.companyId = await checkCompany(user, value);
        if (!value.companyId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
        }

        // Manually find the current open register for this company
        const openRegister = await getFirstMatch(PosCashRegisterModel, {
            companyId: value.companyId,
            status: CASH_REGISTER_STATUS.OPEN,
            isDeleted: false
        }, { _id: 1 }, {});

        if (!openRegister) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No open register found for this company. Please open a register first.", {}, {}));
        }

        value.registerId = openRegister._id;
        value.createdBy = user?._id || null;
        value.updatedBy = user?._id || null;

        const response = await createOne(CashControlModel, value);
        if (!response) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.addDataError, {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Cash Control"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const editCashControl = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = editCashControlSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const isExist = await getFirstMatch(CashControlModel, { _id: value?.cashControlId, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Cash Control"), {}, {}));
        }


        value.updatedBy = user?._id || null;
        const response = await updateData(CashControlModel, { _id: value?.cashControlId }, value, {});

        if (!response) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.updateDataError("Cash Control"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Cash Control"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getAllCashControl = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;

        let { page, limit, search, registerFilter, typeFilter, startDate, endDate, companyFilter, branchFilter } = req?.query;
        page = Number(page);
        limit = Number(limit);

        let criteria: any = { isDeleted: false };
        if (companyId) criteria.companyId = companyId;
        if (companyFilter) criteria.companyId = companyFilter;
        if (branchFilter) criteria.branchId = branchFilter;
        if (typeFilter) criteria.type = typeFilter;


        if (registerFilter == "true") {
            const openRegister = await getFirstMatch(PosCashRegisterModel, {
                companyId: companyId,
                status: CASH_REGISTER_STATUS.OPEN,
                isDeleted: false
            }, { _id: 1 }, {});

            if (openRegister) {
                criteria.registerId = openRegister?._id;
            }
        }

        if (startDate && endDate) {
            criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        if (search) {
            criteria.remark = { $regex: search, $options: "si" };
        }

        const options = {
            sort: { createdAt: -1 },
            skip: (page - 1) * limit,
            limit,
            populate: [
                { path: "registerId", select: "registerNo" },
                { path: "companyId", select: "name" },
                { path: "branchId", select: "name" },
            ]
        };

        const response = await getDataWithSorting(CashControlModel, criteria, {}, options);
        const totalData = await countData(CashControlModel, criteria);

        const totalAmountAggregate = await CashControlModel.aggregate([
            { $match: criteria },
            { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
        ])

        const totalAmount = totalAmountAggregate[0]?.totalAmount || 0;

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Cash Control"), {
            cashControl_data: response,
            totalData,
            totalAmount,
            state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 }
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getOneCashControl = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getCashControlSchema.validate(req.params);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const response = await getFirstMatch(CashControlModel, { _id: value?.id, isDeleted: false }, {}, {
            populate: [
                { path: "registerId" },
                { path: "companyId", select: "name" },
                { path: "branchId", select: "name" },
            ]
        });

        if (!response) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Cash Control"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Cash Control"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const deleteCashControl = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = deleteCashControlSchema.validate(req.params);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const isExist = await getFirstMatch(CashControlModel, { _id: value?.id, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Cash Control"), {}, {}));
        }

        const response = await updateData(CashControlModel, { _id: value?.id }, { isDeleted: true }, {});

        if (!response) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.deleteDataError("Cash Control"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Cash Control"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const cashControlDropDown = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;

        const { search, branchId, companyFilter, registerFilter } = req.query;
        let criteria: any = { isDeleted: false };
        if (companyId) criteria.companyId = companyId;
        if (branchId) criteria.branchId = branchId;
        if (companyFilter) criteria.companyId = companyFilter;

        if (registerFilter) {
            const openRegister = await getFirstMatch(PosCashRegisterModel, {
                companyId: companyId,
                status: CASH_REGISTER_STATUS.OPEN,
                isDeleted: false
            }, { _id: 1 }, {});

            if (openRegister) {
                criteria.registerId = openRegister?._id;
            }
        }

        if (search) {
            criteria.remark = { $regex: search, $options: "si" };
        }

        const response = await CashControlModel.find(criteria, { remark: 1, amount: 1 }).sort({ createdAt: -1 }).limit(100);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Cash Control Dropdown"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

