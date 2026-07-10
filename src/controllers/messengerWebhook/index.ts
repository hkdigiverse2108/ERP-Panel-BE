import { apiResponse, HTTP_STATUS } from "../../common";
import { messengerConfigModel, contactModel } from "../../database";
import { getFirstMatch, reqInfo, responseMessage, createOne, updateData } from "../../helper";
import { verifyWebhookSignature } from "../../helper/messenger";

export const verifyWebhook = async (req, res) => {
  reqInfo(req);
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (!mode || !token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Missing mode or token", {}, {}));
    }

    const config = await getFirstMatch(messengerConfigModel, { verifyToken: token, isDeleted: false }, {}, {});
    if (!config) {
      return res.status(HTTP_STATUS.FORBIDDEN).send("Verification token mismatch");
    }

    if (mode === "subscribe" && token === config.verifyToken) {
      console.log(`Webhook verified for page: ${config.pageId}`);
      return res.status(HTTP_STATUS.OK).send(challenge);
    }

    return res.status(HTTP_STATUS.FORBIDDEN).send("Verification failed");
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const findOrCreateContactByPsid = async (psid: string, pageId: string) => {
  const config = await getFirstMatch(messengerConfigModel, { pageId, isDeleted: false }, {}, {});
  if (!config) return null;

  const existingContact = await getFirstMatch(contactModel, { messengerPsid: psid, branchId: config.branchId, isDeleted: false }, {}, {});
  if (existingContact) return existingContact;

  const newContact = {
    firstName: `Messenger_${psid.substring(0, 8)}`,
    companyId: config.companyId,
    branchId: config.branchId,
    messengerPsid: psid,
    messengerOptIn: true,
    contactType: "customer",
    createdBy: null,
    updatedBy: null,
  };

  return await createOne(contactModel, newContact);
};

export const receiveWebhook = async (req, res) => {
  reqInfo(req);
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    const rawBody = JSON.stringify(req.body);
    const pageId = req.body?.entry?.[0]?.id;

    if (!pageId) {
      return res.status(HTTP_STATUS.OK).json({ status: "ok" });
    }

    const config = await getFirstMatch(messengerConfigModel, { pageId, isDeleted: false }, {}, {});
    if (config && signature) {
      const isValid = verifyWebhookSignature(config.appSecret, rawBody, signature);
      if (!isValid) {
        console.error("Webhook signature verification failed");
        return res.status(HTTP_STATUS.FORBIDDEN).json(new apiResponse(HTTP_STATUS.FORBIDDEN, "Invalid signature", {}, {}));
      }
    }

    const entries = req.body?.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        if (event.message && event.sender?.id) {
          const psid = event.sender.id;
          const eventPageId = entry.id;

          await findOrCreateContactByPsid(psid, eventPageId);
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
  }
};
