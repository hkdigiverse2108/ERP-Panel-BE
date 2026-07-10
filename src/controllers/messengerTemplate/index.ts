import { apiResponse, HTTP_STATUS } from "../../common";
import { messengerTemplateModel } from "../../database";
import { checkBranch, checkCompany, countData, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { createTemplateOnMeta, deleteTemplateOnMeta, refreshTemplateStatus as refreshOnMeta, uploadTemplateImageHandle } from "../../helper/messenger";
import { addMessengerTemplateSchema, deleteMessengerTemplateSchema, refreshMessengerTemplateSchema } from "../../validation";
import { messengerConfigModel } from "../../database";

export const createTemplate = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = addMessengerTemplateSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);
    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const config = await getFirstMatch(messengerConfigModel, { branchId: value.branchId, isDeleted: false }, {}, {});
    if (!config) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No Messenger config found for this branch. Connect a Facebook Page first.", {}, {}));

    let metaResult;
    try {
      metaResult = await createTemplateOnMeta(config, value);
    } catch (metaError) {
      console.error("Meta API error:", metaError?.response?.data || metaError.message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, metaError?.response?.data?.error?.message || "Failed to create template on Meta", {}, metaError));
    }

    value.metaTemplateId = metaResult?.id;
    value.status = "PENDING";

    const { createOne } = require("../../helper");
    const response = await createOne(messengerTemplateModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("Messenger Template"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllTemplates = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let { page, limit, search } = req.query;

    const branchId = await checkBranch(user, {});
    let criteria: any = { isDeleted: false };

    if (branchId) criteria.branchId = branchId;

    const companyId = await checkCompany(user, {});
    if (companyId) criteria.companyId = companyId;

    if (search) {
      criteria.$or = [
        { name: { $regex: search, $options: "si" } },
        { status: { $regex: search, $options: "si" } },
      ];
    }

    const options: any = { sort: { createdAt: -1 } };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(messengerTemplateModel, criteria, {}, options);
    const totalData = await countData(messengerTemplateModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;
    const stateObj = { page, limit, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Messenger Templates"), { template_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const refreshTemplateStatus = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = refreshMessengerTemplateSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const branchId = await checkBranch(user, {});
    const config = await getFirstMatch(messengerConfigModel, { branchId, isDeleted: false }, {}, {});
    if (!config) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No Messenger config found for this branch.", {}, {}));

    if (value.id) {
      const template = await getFirstMatch(messengerTemplateModel, { _id: value.id, isDeleted: false }, {}, {});
      if (!template) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Template"), {}, {}));

      let metaResult;
      try {
        metaResult = await refreshOnMeta(config, template.metaTemplateId);
      } catch (metaError) {
        console.error("Meta API error:", metaError?.response?.data || metaError.message);
        return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, metaError?.response?.data?.error?.message || "Failed to refresh status from Meta", {}, metaError));
      }

      const metaTemplate = metaResult?.data?.[0] || metaResult;
      if (metaTemplate?.status) {
        const updatePayload: any = { status: metaTemplate.status };
        if (metaTemplate.rejection_reason) updatePayload.rejectionReason = metaTemplate.rejection_reason;
        await updateData(messengerTemplateModel, { _id: value.id }, updatePayload, {});
      }

      const updated = await getFirstMatch(messengerTemplateModel, { _id: value.id }, {}, {});
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Template Status"), updated, {}));
    }

    const templates = await getDataWithSorting(messengerTemplateModel, { branchId, isDeleted: false, metaTemplateId: { $ne: null }, status: { $ne: "DELETED" } }, {}, {});
    const results = [];
    for (const template of templates) {
      try {
        const metaResult = await refreshOnMeta(config, template.metaTemplateId);
        const metaTemplate = metaResult?.data?.[0] || metaResult;
        if (metaTemplate?.status) {
          const updatePayload: any = { status: metaTemplate.status };
          if (metaTemplate.rejection_reason) updatePayload.rejectionReason = metaTemplate.rejection_reason;
          await updateData(messengerTemplateModel, { _id: template._id }, updatePayload, {});
          results.push({ id: template._id, status: metaTemplate.status });
        }
      } catch (e) {
        results.push({ id: template._id, error: e.message });
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("Template Statuses"), results, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteTemplate = async (req, res) => {
  reqInfo(req);
  try {
    const { error, value } = deleteMessengerTemplateSchema.validate(req.params);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const template = await getFirstMatch(messengerTemplateModel, { _id: value.id, isDeleted: false }, {}, {});
    if (!template) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Template"), {}, {}));

    if (template.metaTemplateId) {
      const config = await getFirstMatch(messengerConfigModel, { branchId: template.branchId, isDeleted: false }, {}, {});
      if (config) {
        try {
          await deleteTemplateOnMeta(config, template.metaTemplateId);
        } catch (metaError) {
          console.error("Meta API error:", metaError?.response?.data || metaError.message);
        }
      }
    }

    const { user } = req.headers;
    await updateData(messengerTemplateModel, { _id: value.id }, { isDeleted: true, updatedBy: user?._id || null }, {});

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Messenger Template"), {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const uploadTemplateImage = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    if (!req.file) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage?.fieldIsRequired("Image file"), {}, {}));

    const branchId = await checkBranch(user, {});
    const config = await getFirstMatch(messengerConfigModel, { branchId, isDeleted: false }, {}, {});
    if (!config) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No Messenger config found for this branch.", {}, {}));

    const result = await uploadTemplateImageHandle(config, req.file.buffer, req.file.mimetype);
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Image uploaded", result, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
