import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { metaWhatsAppAccountModel, metaMessageTemplateModel, metaMessageLogModel, contactModel, PosOrderModel } from "../../database";
import { checkBranch, checkCompany, countData, createOne, getData, getDataWithSorting, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { MetaWhatsAppService } from "../../services/metaWhatsApp.service";
import {
  upsertMetaWhatsAppAccountSchema,
  createMetaTemplateSchema,
  sendPosBillWhatsAppSchema,
  bulkSendContactWhatsAppSchema,
  getMetaTemplatesSchema,
  getMetaLogsSchema,
} from "../../validation";

const COMMON_SEND_SUCCESS = "Message request submitted successfully.";
const COMMON_SEND_ERROR = "Message could not be sent. Please try again.";

const getCompanyId = async (user: any) => {
  if (user.userType === USER_TYPES.SUPER_ADMIN) return null;
  return await checkCompany(user, {});
};

export const upsertAccount = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = upsertMetaWhatsAppAccountSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    value.companyId = await checkCompany(user, value);
    value.branchId = await checkBranch(user, value);
    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    if (value.accountId) {
      const existing = await getFirstMatch(metaWhatsAppAccountModel, { _id: value.accountId, isDeleted: false }, {}, {});
      if (!existing) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("WhatsApp Account"), {}, {}));
      const { accountId, ...restData } = value;
      const response = await updateData(metaWhatsAppAccountModel, { _id: accountId }, restData, {});
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.updateDataSuccess("WhatsApp Account"), response, {}));
    }

    const { createOne: create } = require("../../helper");
    const response = await create(metaWhatsAppAccountModel, value);
    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("WhatsApp Account"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getAccounts = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let criteria: any = { isDeleted: false };

    const companyId = await getCompanyId(user);
    if (companyId) criteria.companyId = companyId;

    const response = await getData(metaWhatsAppAccountModel, criteria, {}, { sort: { createdAt: -1 }, populate: [{ path: "companyId", select: "name displayName" }] });
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("WhatsApp Accounts"), response || [], {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const createTemplate = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = createMetaTemplateSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    if (user.userType !== USER_TYPES.SUPER_ADMIN) {
      const userCompany = await checkCompany(user, value);
      value.companyIds = [userCompany];
    }
    value.branchId = await checkBranch(user, value);
    value.createdBy = user?._id || null;
    value.updatedBy = user?._id || null;

    const account = await getFirstMatch(metaWhatsAppAccountModel, { _id: value.accountId, isDeleted: false }, {}, {});
    if (!account) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "WhatsApp account not found.", {}, {}));

    const sanitizedName = value.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    value.name = sanitizedName;

    const components = [...value.components];
    for (const comp of components) {
      if (comp.type === "BODY" && comp.text && !comp.example) {
        const vars = comp.text.match(/\{\{(\d+)\}\}/g) || [];
        const samples = vars.map((v: string, i: number) => `Sample${i + 1}`);
        comp.example = { body_text: [samples] };
      }
    }

    let metaResult;
    try {
      metaResult = await MetaWhatsAppService.createTemplate({
        account,
        name: sanitizedName,
        language: value.language,
        category: value.category,
        components,
      });
    } catch (metaError) {
      console.error("Meta API error:", metaError?.response?.data || metaError.message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, metaError?.response?.data?.error?.message || "Failed to create template on Meta", {}, metaError));
    }

    value.metaTemplateId = metaResult?.data?.id;
    value.status = "PENDING";

    const { createOne: create } = require("../../helper");
    const response = await create(metaMessageTemplateModel, value);
    if (!response) return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json(new apiResponse(HTTP_STATUS.NOT_IMPLEMENTED, responseMessage?.addDataError, {}, {}));

    return res.status(HTTP_STATUS.CREATED).json(new apiResponse(HTTP_STATUS.CREATED, responseMessage?.addDataSuccess("WhatsApp Template"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const syncTemplates = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const companyId = await getCompanyId(user);

    let accountCriteria: any = { isDeleted: false };
    if (companyId) accountCriteria.companyId = companyId;

    const accounts = await getData(metaWhatsAppAccountModel, accountCriteria, {}, {});
    if (!accounts || accounts.length === 0) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No WhatsApp accounts found to sync.", {}, {}));

    const results: any[] = [];

    for (const account of accounts) {
      try {
        const metaData = await MetaWhatsAppService.listTemplates(account);
        const metaTemplates = metaData?.data || [];

        for (const mt of metaTemplates) {
          const existing = await getFirstMatch(metaMessageTemplateModel, {
            metaTemplateId: mt.id,
            isDeleted: false,
          }, {}, {});

          if (existing) {
            const updatePayload: any = { status: mt.status };
            if (mt.rejection_reason) updatePayload.rejectionReason = mt.rejection_reason;
            await updateData(metaMessageTemplateModel, { _id: existing._id }, updatePayload, {});
          } else {
            const newTemplate = {
              companyId: account.companyId,
              companyIds: account.companyId ? [account.companyId] : [],
              branchId: account.branchId,
              accountId: account._id,
              metaTemplateId: mt.id,
              name: mt.name,
              language: mt.language || "en_US",
              category: mt.category || "UTILITY",
              status: mt.status || "PENDING",
              components: mt.components || [],
              createdBy: user?._id || null,
              updatedBy: user?._id || null,
            };
            await createOne(metaMessageTemplateModel, newTemplate);
          }
        }

        await updateData(metaWhatsAppAccountModel, { _id: account._id }, { lastTemplateSyncAt: new Date() }, {});
        results.push({ accountId: account._id, synced: metaTemplates.length });
      } catch (e) {
        results.push({ accountId: account._id, error: e.message });
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Templates synced successfully.", results, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getTemplates = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let { error, value } = getMetaTemplatesSchema.validate(req.query);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const { page, limit, search, status, useFor } = value;
    const companyId = await getCompanyId(user);

    let criteria: any = { isDeleted: false };

    if (companyId) {
      criteria.$or = [
        { companyId: companyId },
        { companyIds: companyId },
        { companyIds: { $exists: false } },
        { companyIds: [] },
        { companyId: null },
      ];
    }

    if (status) criteria.status = status;
    if (useFor) criteria.useFor = useFor;

    if (search) {
      criteria.$or = criteria.$or || [];
      criteria.$and = [{ $or: [{ name: { $regex: search, $options: "si" } }, { status: { $regex: search, $options: "si" } }] }];
    }

    const options: any = { sort: { createdAt: -1 }, populate: [{ path: "accountId", select: "displayPhoneNumber phoneNumberId" }] };
    if (page && limit) {
      options.skip = (parseInt(page) - 1) * parseInt(limit);
      options.limit = parseInt(limit);
    }

    const response = await getDataWithSorting(metaMessageTemplateModel, criteria, {}, options);
    const totalData = await countData(metaMessageTemplateModel, criteria);
    const totalPages = page && limit ? Math.ceil(totalData / parseInt(limit)) || 1 : 1;
    const stateObj = { page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("WhatsApp Templates"), { template_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const deleteTemplate = async (req, res) => {
  reqInfo(req);
  try {
    const { id } = req.params;
    if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Template ID is required.", {}, {}));

    const template = await getFirstMatch(metaMessageTemplateModel, { _id: id, isDeleted: false }, {}, { populate: [{ path: "accountId" }] });
    if (!template) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Template"), {}, {}));

    if (template.metaTemplateId && template.accountId) {
      try {
        await MetaWhatsAppService.deleteTemplate(template.accountId, template.metaTemplateId);
      } catch (metaError) {
        console.error("Meta delete failed (non-fatal):", metaError?.response?.data || metaError.message);
      }
    }

    const response = await updateData(metaMessageTemplateModel, { _id: id }, { isDeleted: true }, {});
    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.deleteDataSuccess("Template"), response, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const sendPosBill = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = sendPosBillWhatsAppSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const companyId = await checkCompany(user, {});
    const branchId = await checkBranch(user, {});

    const order = await getFirstMatch(PosOrderModel, { _id: value.posOrderId, isDeleted: false }, {}, { populate: [{ path: "customerId" }, { path: "companyId", select: "enableWhatsApp name address phoneNo" }, { path: "items.productId", select: "name salesTaxId" }] });
    if (!order) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("POS Order"), {}, {}));

    if (order.companyId && !order.companyId.enableWhatsApp) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "WhatsApp is disabled for this company.", {}, {}));
    }

    const contact = order.customerId;
    if (!contact) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Order has no customer.", {}, {}));

    const phone = MetaWhatsAppService.normalizePhone(
      contact.whatsappNo?.countryCode || contact.phoneNo?.countryCode,
      contact.whatsappNo?.phoneNo || contact.phoneNo?.phoneNo,
    );

    if (!phone) {
      const logEntry = {
        companyId, branchId, contactId: contact._id, sourceType: "POS_BILL", sourceId: order._id,
        recipientName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Customer",
        recipientPhone: "", status: "skipped",
        errorMessage: "No valid phone number found.",
        createdBy: user?._id || null, updatedBy: user?._id || null,
      };
      await createOne(metaMessageLogModel, logEntry);
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Customer has no valid phone number.", logEntry, {}));
    }

    let template;
    if (value.templateId) {
      template = await getFirstMatch(metaMessageTemplateModel, { _id: value.templateId, isDeleted: false }, {}, {});
      if (template && companyId) {
        const templateCompanyIds = (template.companyIds || []).filter(Boolean);
        if (templateCompanyIds.length > 0 && !templateCompanyIds.some((id: any) => id.toString() === companyId.toString()) && template.companyId?.toString() !== companyId.toString()) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Template is not assigned to this company.", {}, {}));
        }
      }
    } else {
      const templateCriteria: any = { useFor: "POS_BILL", status: "APPROVED", isDeleted: false };
      if (companyId) {
        templateCriteria.$or = [
          { companyId },
          { companyIds: companyId },
          { companyIds: { $exists: false } },
          { companyIds: { $size: 0 } },
          { companyId: null },
        ];
      }
      template = await getFirstMatch(metaMessageTemplateModel, templateCriteria, {}, { sort: { createdAt: -1 } });
    }
    if (!template) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No approved POS_BILL template found.", {}, {}));

    const account = await getFirstMatch(metaWhatsAppAccountModel, { _id: template.accountId, isDeleted: false }, {}, {});
    if (!account) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "WhatsApp account not found for template.", {}, {}));

    const components = [
      {
        type: "body",
        parameters: [
          { type: "text", text: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Customer" },
          { type: "text", text: String(order.orderNo || "") },
          { type: "text", text: String(order.totalAmount || 0) },
        ],
      },
    ];

    let metaResult;
    try {
      metaResult = await MetaWhatsAppService.sendTemplate({
        account,
        to: phone,
        templateName: template.name,
        language: template.language,
        components,
      });
    } catch (metaError) {
      const errMsg = metaError?.response?.data?.error?.message || metaError.message;
      await createOne(metaMessageLogModel, {
        companyId, branchId, contactId: contact._id, accountId: account._id,
        templateId: template._id, sourceType: "POS_BILL", sourceId: order._id,
        recipientName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Customer",
        recipientPhone: phone, status: "failed", errorMessage: errMsg,
        requestPayload: components, responsePayload: metaError?.response?.data || {},
        createdBy: user?._id || null, updatedBy: user?._id || null,
      });
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, COMMON_SEND_ERROR, {}, {}));
    }

    const metaPricing = metaResult?.data?.messages?.[0]?.pricing || metaResult?.data?.pricing || {};
    const logEntry = {
      companyId, branchId, contactId: contact._id, accountId: account._id,
      templateId: template._id, sourceType: "POS_BILL", sourceId: order._id,
      recipientName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Customer",
      recipientPhone: phone, status: "sent", metaMessageId: metaResult?.data?.messages?.[0]?.id,
      requestPayload: components, responsePayload: metaResult?.data || {},
      pricing: metaPricing, conversationCategory: metaPricing?.category,
      billedAmount: metaPricing?.billable ? (metaPricing?.category === "utility" ? 0.005 : 0.035) : 0,
      sentAt: new Date(), createdBy: user?._id || null, updatedBy: user?._id || null,
    };
    await createOne(metaMessageLogModel, logEntry);

    let pdfSent = false;
    const shouldSendPdf = template.sendAttachment || template.sendPdf;
    if (shouldSendPdf && template.attachmentType === "pdf" && order.items?.length) {
      try {
        const { generatePosBillPdf } = require("../../helper/pdfGenerator");
      const getTaxPercent = (item: any) => item?.productId?.salesTaxId?.percentage || 0;
      const items = (order.items || []).map((item: any) => ({
        name: item.productId?.name || "",
        qty: item.qty || 0,
        mrp: item.mrp || 0,
        taxPercent: getTaxPercent(item),
        netAmount: item.netAmount || 0,
        discountAmount: (item.discountAmount || 0) + (item.additionalDiscountAmount || 0),
      }));

      const companyAddr = order.companyId?.address;
      const addrParts = [companyAddr?.address, companyAddr?.city?.name, companyAddr?.state?.name, companyAddr?.country?.name].filter(Boolean);
      if (companyAddr?.pinCode) addrParts.push(companyAddr.pinCode);

      const pdfFileName = await generatePosBillPdf({
        companyName: order.companyId?.name || "",
        companyAddress: addrParts.join(", "),
        companyPhone: order.companyId?.phoneNo ? `${order.companyId.phoneNo.countryCode || ""}${order.companyId.phoneNo.phoneNo || ""}` : "",
        customerName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Customer",
        customerPhone: contact.phoneNo ? `${contact.phoneNo.countryCode || ""}${contact.phoneNo.phoneNo || ""}` : "",
        orderNo: order.orderNo || "",
        createdAt: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "",
        items,
        additionalCharges: (order.additionalCharges || []).map((ac: any) => ({ name: ac.chargeId?.name || "Charge", amount: ac.totalAmount || 0 })),
        totalDiscount: order.totalDiscount || 0,
        redeemCreditAmount: order.redeemCreditAmount || 0,
        redeemCreditType: order.redeemCreditType || "",
        flatDiscountAmount: order.flatDiscountAmount || 0,
        roundOff: order.roundOff || 0,
        totalAmount: order.totalAmount || 0,
        totalTaxAmount: order.totalTaxAmount || 0,
      });

      const pdfPath = require("path").join(__dirname, "..", "..", "..", "..", "public", "invoices", pdfFileName);
      console.log(`[PDF] Generated: ${pdfFileName}, full path: ${pdfPath}, exists: ${require("fs").existsSync(pdfPath)}`);
      await MetaWhatsAppService.sendDocument({
        account,
        to: phone,
        filePath: pdfPath,
        caption: `Invoice: ${order.orderNo}`,
      });
      pdfSent = true;

        try { require("fs").unlinkSync(pdfPath); } catch (_) { /* cleanup */ }
      } catch (pdfError) {
        console.error("PDF send error (non-fatal):", pdfError.message);
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, COMMON_SEND_SUCCESS + (pdfSent ? " (PDF bill also sent)" : ""), {}, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const bulkSendContacts = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    const { error, value } = bulkSendContactWhatsAppSchema.validate(req.body);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const companyId = await checkCompany(user, {});
    const branchId = await checkBranch(user, {});

    const template = await getFirstMatch(metaMessageTemplateModel, { _id: value.templateId, isDeleted: false }, {}, {});
    if (!template) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Template"), {}, {}));
    if (template.status !== "APPROVED") return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Template must be APPROVED. Current status: " + template.status, {}, {}));

    const account = await getFirstMatch(metaWhatsAppAccountModel, { _id: template.accountId, isDeleted: false }, {}, {});
    if (!account) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "WhatsApp account not found.", {}, {}));

    const contacts = await getData(contactModel, { _id: { $in: value.contactIds }, isDeleted: false }, {}, {});
    if (!contacts || contacts.length === 0) return res.status(HTTP_STATUS.NOT_FOUND).json(new apiResponse(HTTP_STATUS.NOT_FOUND, "No contacts found.", {}, {}));

    let sent = 0, failed = 0, skipped = 0;

    for (const contact of contacts) {
      const phone = MetaWhatsAppService.normalizePhone(
        contact.whatsappNo?.countryCode || contact.phoneNo?.countryCode,
        contact.whatsappNo?.phoneNo || contact.phoneNo?.phoneNo,
      );

      const recipientName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Customer";

      if (!phone) {
        await createOne(metaMessageLogModel, {
          companyId, branchId, contactId: contact._id, accountId: account._id,
          templateId: template._id, sourceType: value.sourceType || "CONTACT_BULK",
          recipientName, recipientPhone: "", status: "skipped",
          errorMessage: "No valid phone number.",
          createdBy: user?._id || null, updatedBy: user?._id || null,
        });
        skipped++;
        continue;
      }

      const components = [
        {
          type: "body",
          parameters: [{ type: "text", text: recipientName }],
        },
      ];

      try {
        const metaResult = await MetaWhatsAppService.sendTemplate({
          account, to: phone, templateName: template.name,
          language: template.language, components,
        });
        const metaPricing = metaResult?.data?.messages?.[0]?.pricing || metaResult?.data?.pricing || {};
        await createOne(metaMessageLogModel, {
          companyId, branchId, contactId: contact._id, accountId: account._id,
          templateId: template._id, sourceType: value.sourceType || "CONTACT_BULK",
          recipientName, recipientPhone: phone, status: "sent",
          metaMessageId: metaResult?.data?.messages?.[0]?.id,
          requestPayload: components, responsePayload: metaResult?.data || {},
          pricing: metaPricing, conversationCategory: metaPricing?.category,
          billedAmount: metaPricing?.billable ? (metaPricing?.category === "utility" ? 0.005 : 0.035) : 0,
          sentAt: new Date(), createdBy: user?._id || null, updatedBy: user?._id || null,
        });
        sent++;
      } catch (metaError) {
        await createOne(metaMessageLogModel, {
          companyId, branchId, contactId: contact._id, accountId: account._id,
          templateId: template._id, sourceType: value.sourceType || "CONTACT_BULK",
          recipientName, recipientPhone: phone, status: "failed",
          errorMessage: metaError?.response?.data?.error?.message || metaError.message,
          requestPayload: components, responsePayload: metaError?.response?.data || {},
          createdBy: user?._id || null, updatedBy: user?._id || null,
        });
        failed++;
      }
    }

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "Bulk send completed.", { total: contacts.length, sent, failed, skipped }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};

export const getMessageLogs = async (req, res) => {
  reqInfo(req);
  try {
    const { user } = req.headers;
    let { error, value } = getMetaLogsSchema.validate(req.query);
    if (error) return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, error?.details[0]?.message, {}, {}));

    const { page, limit, search, status, sourceType } = value;
    const companyId = await getCompanyId(user);
    const branchId = await checkBranch(user, {});

    let criteria: any = { isDeleted: false };
    if (companyId) criteria.companyId = companyId;
    if (branchId) criteria.branchId = branchId;
    if (status) criteria.status = status;
    if (sourceType) criteria.sourceType = sourceType;
    if (search) {
      criteria.$or = [
        { recipientName: { $regex: search, $options: "si" } },
        { recipientPhone: { $regex: search, $options: "si" } },
      ];
    }

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

    const response = await getDataWithSorting(metaMessageLogModel, criteria, {}, options);
    const totalData = await countData(metaMessageLogModel, criteria);
    const totalPages = page && limit ? Math.ceil(totalData / parseInt(limit)) || 1 : 1;
    const stateObj = { page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined, totalPages };

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("WhatsApp Logs"), { log_data: response, totalData, state: stateObj }, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
