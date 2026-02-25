import { apiResponse, HTTP_STATUS } from "../../common";
import { companyDriveModel } from "../../database";
import { countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData, checkCompany } from "../../helper";
import { createCompanyDriveSchema, editCompanyDriveSchema, getCompanyDriveSchema, deleteCompanyDriveSchema } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const addCompanyDrive = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = createCompanyDriveSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        value.companyId = await checkCompany(user, value);
        if (!value.companyId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Company Id"), {}, {}));

        value.branchId = value.branchId || null;
        value.createdBy = user?._id || null;
        value.updatedBy = user?._id || null;

        const response = await createOne(companyDriveModel, value);

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
        }

        return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Company Drive"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message || responseMessage?.internalServerError, {}, error));
    }
};

export const getCompanyDrives = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;
        let { page, limit, search, activeFilter, companyFilter } = req.query;

        page = Number(page) || 1;
        limit = Number(limit);

        let criteria: any = { isDeleted: false };

        if (companyId) {
            criteria.companyId = companyId;
        }

        if (companyFilter) {
            criteria.companyId = companyFilter;
        }

        if (search) {
            criteria.$or = [{ documentName: { $regex: search, $options: "si" } }];
        }

        if (activeFilter) {
            criteria.isActive = activeFilter === "true" ? true : false;
        }

        const options = {
            sort: { createdAt: -1 },
            populate: [
                { path: "createdBy", select: "fullName" },
                { path: "updatedBy", select: "fullName" },
            ],
            skip: (page - 1) * limit,
            limit
        };

        const [response, totalData] = await Promise.all([
            getDataWithSorting(companyDriveModel, criteria, {}, options),
            countData(companyDriveModel, criteria)
        ]);

        const totalPages = Math.ceil(totalData / limit) || 1;

        const state = { page, limit, totalPages };

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Company Drives"), { companyDrive_data: response, totalData, state }, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const getCompanyDriveById = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getCompanyDriveSchema.validate(req.params);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const response = await getFirstMatch(
            companyDriveModel,
            { _id: value.id, isDeleted: false },
            {},
            {
                populate: [
                    { path: "createdBy", select: "fullName" },
                    { path: "updatedBy", select: "fullName" },
                ]
            }
        );

        if (!response) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Company Drive"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Company Drive"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const updateCompanyDrive = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = editCompanyDriveSchema.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const isExist = await getFirstMatch(companyDriveModel, { _id: value.documentId, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Company Drive"), {}, {}));
        }

        value.updatedBy = user?._id || null;

        const response = await updateData(companyDriveModel, { _id: new ObjectId(value.documentId) }, value, {});

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Company Drive"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Company Drive"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const deleteCompanyDrive = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = deleteCompanyDriveSchema.validate(req.params);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const isExist = await getFirstMatch(companyDriveModel, { _id: value.id, isDeleted: false }, {}, {});
        if (!isExist) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Company Drive"), {}, {}));
        }

        const payload = {
            isDeleted: true,
            updatedBy: user?._id || null,
        };

        const response = await updateData(companyDriveModel, { _id: new ObjectId(value.id) }, payload, {});

        if (!response) {
            return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.deleteDataError("Company Drive"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Company Drive"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};
