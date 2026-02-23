import { Request, Response } from "express";
import { apiResponse, HTTP_STATUS } from "../../common";
import { socialMediaModel } from "../../database";
import { createOne, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { updateSocialMediaValidation } from "../../validation";

const ObjectId = require("mongoose").Types.ObjectId;

export const getSocialMedia = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const response = await getFirstMatch(
            socialMediaModel,
            { isDeleted: false },
            {},
            {}
        );

        if (!response) {
            // It's not an error if it doesn't exist yet, just return empty list
            return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Social Media Links"), { links: [] }, {}));
        }

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Social Media Links"), response, {}));
    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};

export const updateSocialMedia = async (req: Request | any, res: Response | any) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;

        const { error, value } = updateSocialMediaValidation.validate(req.body);

        if (error) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));
        }

        const { links } = value;

        // Check if a document already exists
        const existingDoc = await getFirstMatch(socialMediaModel, { isDeleted: false }, {}, {});

        if (existingDoc) {
            // Update existing
            const payload = {
                links,
                updatedBy: user?._id || null,
            };

            const response = await updateData(socialMediaModel, { _id: existingDoc._id }, payload, {});

            if (!response) {
                return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.updateDataError("Social Media Links"), {}, {}));
            }

            return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Social Media Links"), response, {}));
        } else {
            // Create new
            const payload = {
                links,
                createdBy: user?._id || null,
                updatedBy: user?._id || null,
            };

            const response = await createOne(socialMediaModel, payload);

            if (!response) {
                return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));
            }

            return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Social Media Links"), response, {}));
        }

    } catch (error: any) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};
