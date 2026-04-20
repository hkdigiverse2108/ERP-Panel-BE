import { Request, Response } from "express";
import { apiResponse, HTTP_STATUS } from "../../common";
import { settingsModel } from "../../database";
import { createOne, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addReportFormatValidation, updateReportFormatValidation, updateSettingsValidation } from "../../validation";

export const getSettings = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const response = await getFirstMatch(
            settingsModel,
            { isDeleted: false },
            {},
            {
                populate: [
                    { path: "createdBy", select: "fullName userType" },
                    { path: "updatedBy", select: "name userType" },
                ]
            }
        );

        if (!response) {
            // It's not an error if it doesn't exist yet, just return empty list or default structure
            return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Settings"), {}, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Settings"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const updateSettings = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;

        const { error, value } = updateSettingsValidation.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        // Check if a document already exists
        const existingDoc = await getFirstMatch(settingsModel, { isDeleted: false }, {}, {});

        if (existingDoc) {
            // Update existing
            const payload = {
                ...value,
                updatedBy: user?._id || null,
            };

            const response = await updateData(settingsModel, { _id: existingDoc._id }, payload, {});

            if (!response) {
                return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Settings"), {}, {}));
            }

            return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Settings"), response, {}));
        } else {
            // Create new
            const payload = {
                ...value,
                createdBy: user?._id || null,
                updatedBy: user?._id || null,
            };

            const response = await createOne(settingsModel, payload);

            if (!response) {
                return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
            }

            return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Settings"), response, {}));
        }

    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const addReportFormat = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = addReportFormatValidation.validate(req.body);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        const existingDoc = await getFirstMatch(settingsModel, { isDeleted: false }, {}, {});
        if (!existingDoc) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Settings not found", {}, {}));

        const response = await updateData(settingsModel, { _id: existingDoc._id }, { $push: { reportFormats: value }, $set: { updatedBy: user?._id || null } }, {});
        if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, "Error adding report format", {}, {}));

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Report format added successfully", response.reportFormats[response.reportFormats.length - 1], {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
}

export const updateReportFormat = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { error, value } = updateReportFormatValidation.validate(req.body);
        if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

        const { reportFormatId, ...updateFields } = value;

        // If formats are provided, ensure only one isSelected is true (Radio button behavior)
        if (updateFields.formats) {
            let selectedFound = false;
            updateFields.formats = updateFields.formats.map((f: any) => {
                if (f.isSelected) {
                    if (selectedFound) {
                        return { ...f, isSelected: false };
                    }
                    selectedFound = true;
                }
                return f;
            });
        }

        const updateDataPayload: any = { updatedBy: user?._id || null };
        if (updateFields.type) updateDataPayload["reportFormats.$.type"] = updateFields.type;
        if (updateFields.formats) updateDataPayload["reportFormats.$.formats"] = updateFields.formats;

        const response = await updateData(settingsModel, { "reportFormats._id": reportFormatId }, { $set: updateDataPayload }, {});
        if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Report format not found", {}, {}));

        // Return only the specific updated report format
        const updatedFormat = response.reportFormats.find((item: any) => item._id.toString() === reportFormatId);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Report format updated successfully", updatedFormat, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
}

export const deleteReportFormat = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const { id } = req.params;
        if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Report format ID is required", {}, {}));

        const response = await updateData(settingsModel, { "reportFormats._id": id }, { $pull: { reportFormats: { _id: id } }, $set: { updatedBy: user?._id || null } }, {});
        if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Report format not found", {}, {}));

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Report format deleted successfully", response, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
}

export const getAllReportFormats = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const { search } = req.query;
        const existingDoc = await getFirstMatch(settingsModel, { isDeleted: false }, { reportFormats: 1 }, {});

        if (!existingDoc) {
            return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Report Formats"), [], {}));
        }

        let reportFormats = existingDoc.reportFormats || [];

        if (search) {
            const searchRegex = new RegExp(search as string, "i");
            reportFormats = reportFormats.filter((item: any) => searchRegex.test(item.type));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Report Formats"), reportFormats, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
}
