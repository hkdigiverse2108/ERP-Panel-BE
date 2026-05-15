import { Request, Response } from "express";
import { apiResponse, HTTP_STATUS } from "../../common";
import { reportFormatModel, branchModel } from "../../database";
import { createOne, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { addReportFormatValidation } from "../../validation";

export const getAllReportFormats = async (req: Request | any, res: Response | any) => {
  reqInfo(req);
  try {
    const { search, activeFilter, type } = req.query;
    let query: any = { isDeleted: false };

    if (activeFilter !== undefined) {
      query.isActive = activeFilter === "true" || activeFilter === true;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.name = { $regex: new RegExp(search as string, "i") };
    }

    const reportFormats = await reportFormatModel.find(query).sort({ type: 1, name: 1 });

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Report Formats"), reportFormats, {}));
  } catch (error) {
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

    if (value.isSystemDefault) {
      // Unset existing default for this type
      await reportFormatModel.updateMany({ type: value.type, isSystemDefault: true }, { isSystemDefault: false });
    }

    const payload = {
      ...value,
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };

    const response = await createOne(reportFormatModel, payload);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, "Error adding report format", {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Report format added successfully", response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteReportFormat = async (req: Request | any, res: Response | any) => {
  reqInfo(req);
  try {
    const { id } = req.params;
    if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Report format ID is required", {}, {}));

    const response = await updateData(reportFormatModel, { _id: id }, { isDeleted: true }, {});
    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Report format not found", {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Report format deleted successfully", {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getBranchReportConfig = async (req: Request | any, res: Response | any) => {
  reqInfo(req);
  try {
    const { user } = req?.headers;
    const branchId = req.query.branchId || user?.branchId;

    if (!branchId) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Branch ID is required", {}, {}));

    // 1. Get all active system defaults
    const systemDefaults = await reportFormatModel.find({ isSystemDefault: true, isActive: true, isDeleted: false });
    
    // 2. Get the branch config
    const branch = await getFirstMatch(branchModel, { _id: branchId, isDeleted: false }, { reportConfig: 1 }, {});
    if (!branch) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Branch not found", {}, {}));

    // 3. Merge: Default -> Branch Config
    const configMap: any = {};
    systemDefaults.forEach((item) => {
      configMap[item.type] = item.name;
    });

    if (branch.reportConfig && Array.isArray(branch.reportConfig)) {
      branch.reportConfig.forEach((item: any) => {
        configMap[item.type] = item.formatName;
      });
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Effective report configuration retrieved", configMap, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
