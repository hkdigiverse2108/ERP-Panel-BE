import { apiResponse, HTTP_STATUS } from "../../common";
import { messengerLogModel, messengerTemplateModel, contactModel } from "../../database";
import { checkBranch, checkCompany, countData, createOne, getDataWithSorting, getFirstMatch, reqInfo, responseMessage } from "../../helper";
import { sendUtilityMessage } from "../../helper/messenger";
import { sendMessengerMessageSchema } from "../../validation";
import { messengerConfigModel } from "../../database";

export const sendManualMessage = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = sendMessengerMessageSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const contact = await getFirstMatch(contactModel, { _id: value.contactId, isDeleted: false }, {}, {});
    if (!contact) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Contact"), {}, {}));
    if (!contact.messengerPsid) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Contact has not opted into Messenger messaging. No PSID available.", {}, {}));

    const template = await getFirstMatch(messengerTemplateModel, { _id: value.templateId, isDeleted: false }, {}, {});
    if (!template) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Template"), {}, {}));
    if (template.status !== "APPROVED") return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Template must be APPROVED before sending. Current status: " + template.status, {}, {}));

    const branchId = await checkBranch(user, {});
    const config = await getFirstMatch(messengerConfigModel, { branchId: branchId || template.branchId, isDeleted: false }, {}, {});
    if (!config) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No Messenger config found.", {}, {}));

    let metaResult;
    try {
      metaResult = await sendUtilityMessage(config, contact.messengerPsid, template.name, value.variableValues || {});
    } catch (metaError) {
      console.error("Meta API error:", metaError?.response?.data || metaError.message);
      const logEntry = {
        companyId: template.companyId,
        branchId: branchId || template.branchId,
        contactId: value.contactId,
        templateId: value.templateId,
        triggerEvent: "MANUAL",
        referenceType: value.referenceType,
        referenceId: value.referenceId,
        payloadSent: value.variableValues,
        status: "FAILED",
        errorReason: metaError?.response?.data?.error?.message || metaError.message,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      };
      await createOne(messengerLogModel, logEntry);
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, metaError?.response?.data?.error?.message || "Failed to send message", {}, metaError));
    }

    const logEntry = {
      companyId: template.companyId,
      branchId: branchId || template.branchId,
      contactId: value.contactId,
      templateId: value.templateId,
      triggerEvent: "MANUAL",
      referenceType: value.referenceType,
      referenceId: value.referenceId,
      payloadSent: value.variableValues,
      status: "SENT",
      metaMessageId: metaResult?.message_id,
      sentAt: new Date(),
      createdBy: user?._id || null,
      updatedBy: user?._id || null,
    };
    await createOne(messengerLogModel, logEntry);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.addDataSuccess("Message sent"), metaResult, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getLogsForContact = async (req, res) => {
  reqInfo(req);
  try {
    const { contactId } = req.params;
    let { page, limit } = req.query;

    let criteria: any = { contactId, isDeleted: false };

    const options: any = { sort: { createdAt: -1 } };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(messengerLogModel, criteria, {}, options);
    const totalData = await countData(messengerLogModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;
    const stateObj = { page, limit, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Messenger Logs"), { log_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAllLogs = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let { page, limit, search } = req.query;

    const branchId = await checkBranch(user, {});
    let criteria: any = { isDeleted: false };
    if (branchId) criteria.branchId = branchId;

    const companyId = await checkCompany(user, {});
    if (companyId) criteria.companyId = companyId;

    const options: any = {
      sort: { createdAt: -1 },
      populate: [
        { path: "contactId", select: "firstName lastName companyName phoneNo" },
        { path: "templateId", select: "name status" },
      ],
    };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(messengerLogModel, criteria, {}, options);
    const totalData = await countData(messengerLogModel, criteria);
    const totalPages = Math.ceil(totalData / limit) || 1;
    const stateObj = { page, limit, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Messenger Logs"), { log_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
