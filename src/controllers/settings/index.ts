import { Request, Response } from "express";
import { apiResponse, HTTP_STATUS } from "../../common";
import { settingsModel } from "../../database";
import { createOne, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { updateSettingsValidation } from "../../validation";

export const getSettings = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const response = await getFirstMatch(
            settingsModel,
            { isDeleted: false },
            {},
            {}
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
