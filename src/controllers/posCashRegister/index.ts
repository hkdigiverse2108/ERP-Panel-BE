import { PosCashRegisterModel, bankModel, branchModel } from "../../database";
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
    generateSequenceNumber
} from "../../helper";
import {
    addPosCashRegisterSchema,
    editPosCashRegisterSchema,
    getPosCashRegisterSchema,
    deletePosCashRegisterSchema,
    getAllPosCashRegisterSchema,
    posCashRegisterDropDownSchema
} from "../../validation";

export const addPosCashRegister = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = addPosCashRegisterSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        value.companyId = await checkCompany(user, value);
        if (!value.companyId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));
        }


        const existingOpenRegister = await getFirstMatch(PosCashRegisterModel, {
            companyId: value.companyId,
            status: CASH_REGISTER_STATUS.OPEN,
            isDeleted: false
        }, {}, {});

        if (existingOpenRegister) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "An open register already exists for this company", {}, {}));
        }

        value.createdBy = user?._id || null;
        value.updatedBy = user?._id || null;
        value.registerNo = await generateSequenceNumber({ model: PosCashRegisterModel, prefix: "REG", companyId: value.companyId });

        const response = await createOne(PosCashRegisterModel, value);
        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("POS Cash Register"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const editPosCashRegister = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = editPosCashRegisterSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        if (value.branchId && !(await checkIdExist(branchModel, value.branchId, "Branch", res))) return;
        if (value.bankAccountId && !(await checkIdExist(bankModel, value.bankAccountId, "Bank", res))) return;

        const isExist = await getFirstMatch(PosCashRegisterModel, { _id: value?.posCashRegisterId, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Cash Register"), {}, {}));
        }

        value.updatedBy = user?._id || null;
        const response = await updateData(PosCashRegisterModel, { _id: value?.posCashRegisterId }, value, {});

        if (!response) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.updateDataError("POS Cash Register"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("POS Cash Register"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getAllPosCashRegister = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;

        const { error, value } = getAllPosCashRegisterSchema.validate(req.query);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        let { page = 1, limit = 10, companyFilter, branchFilter, statusFilter, startDate, endDate } = value;
        page = Number(page);
        limit = Number(limit);

        let criteria: any = { isDeleted: false };
        if (companyId) criteria.companyId = companyId;
        if (companyFilter) criteria.companyId = companyFilter;
        if (branchFilter) criteria.branchId = branchFilter;
        if (statusFilter) criteria.status = statusFilter;

        if (startDate && endDate) {
            criteria.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }


        const options = {
            sort: { createdAt: -1 },
            skip: (page - 1) * limit,
            limit,
            populate: [
                { path: "branchId", select: "name" },
                { path: "companyId", select: "name" },
                { path: "bankAccountId", select: "name" },
            ]
        };

        const response = await getDataWithSorting(PosCashRegisterModel, criteria, {}, options);
        const totalData = await countData(PosCashRegisterModel, criteria);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Cash Register"), {
            posCashRegister_data: response,
            totalData,
            state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 }
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getOnePosCashRegister = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getPosCashRegisterSchema.validate(req.params);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const response = await getFirstMatch(PosCashRegisterModel, { _id: value?.id, isDeleted: false }, {}, {
            populate: [
                { path: "branchId", select: "name" },
                { path: "companyId", select: "name" },
                { path: "bankAccountId", select: "name" },
            ]
        });

        if (!response) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Cash Register"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Cash Register"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const deletePosCashRegister = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = deletePosCashRegisterSchema.validate(req.params);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const isExist = await getFirstMatch(PosCashRegisterModel, { _id: value?.id, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Cash Register"), {}, {}));
        }

        const response = await updateData(PosCashRegisterModel, { _id: value?.id }, { isDeleted: true }, {});

        if (!response) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.deleteDataError("POS Cash Register"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("POS Cash Register"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};

export const posCashRegisterDropDown = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;

        const { error, value } = posCashRegisterDropDownSchema.validate(req.query);
        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const { branchId, status } = value;
        let criteria: any = { isDeleted: false };
        if (companyId) criteria.companyId = companyId;
        if (branchId) criteria.branchId = branchId;
        if (status) criteria.status = status;

        const response = await PosCashRegisterModel.find(criteria, { _id: 1, openingCash: 1, status: 1 })
            .populate({ path: "branchId", select: "name" })
            .sort({ createdAt: -1 })
            .limit(100);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("POS Cash Register Dropdown"), response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error?.message || responseMessage?.internalServerError, {}, error));
    }
};
