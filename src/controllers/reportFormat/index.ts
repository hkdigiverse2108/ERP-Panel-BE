import { Request, Response } from "express";
import { apiResponse, HTTP_STATUS } from "../../common";
import { reportFormatModel, branchModel } from "../../database";
import { getFirstMatch, reqInfo, responseMessage } from "../../helper";
import { addReportFormatValidation } from "../../validation";

export const getAllReportFormats = async (req: Request | any, res: Response | any) => {
  reqInfo(req);
  try {
    const { search, type } = req.query;
    let query: any = { isDeleted: false };

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { type: { $regex: new RegExp(search as string, "i") } },
        { "formats.name": { $regex: new RegExp(search as string, "i") } }
      ];
    }

    const reportFormats = await reportFormatModel.find(query).sort({ type: 1 });

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

    const { type, formats } = value;

    // Validate that only one system default is present in the provided list
    const defaultCount = formats.filter((f: any) => f.isSystemDefault).length;
    if (defaultCount > 1) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Only one format can be marked as system default per type", {}, {}));
    }

    const reportType = await reportFormatModel.findOneAndUpdate(
      { type },
      {
        $set: {
          formats,
          updatedBy: user?._id || null
        },
        $setOnInsert: { createdBy: user?._id || null }
      },
      { upsert: true, new: true }
    );

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Report formats updated successfully for this type", reportType, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteReportFormat = async (req: Request | any, res: Response | any) => {
  reqInfo(req);
  try {
    const { id } = req.params; // Document ID (the type document)
    if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Report format ID is required", {}, {}));

    const response = await reportFormatModel.findByIdAndUpdate(id, { isDeleted: true });
    if (!response) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Report format not found", {}, {}));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Report type deleted successfully", {}, {}));
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

    // 1. Get all active designs to extract system defaults
    const reportTypes = await reportFormatModel.find({ isActive: true, isDeleted: false });

    // 2. Get the branch config
    const branch = await getFirstMatch(branchModel, { _id: branchId, isDeleted: false }, { reportConfig: 1 }, {});
    if (!branch) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "Branch not found", {}, {}));

    // 3. Build effective config map
    const configMap: any = {};

    // First, set system defaults from each type
    reportTypes.forEach((doc) => {
      const defaultFormat = doc.formats.find(f => f.isSystemDefault && f.isActive && !f.isDeleted);
      if (defaultFormat) {
        configMap[doc.type] = defaultFormat.name;
      }
    });

    // Second, override with branch configuration
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
