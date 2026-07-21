import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const normalizePhone = (countryCode?: string, phoneNo?: string | number) => {
  const phone = `${countryCode || ""}${phoneNo || ""}`.replace(/\D/g, "");
  return phone.length >= 10 ? phone : "";
};

const uploadMedia = async (account: any, filePath: string) => {
  const url = `https://graph.facebook.com/${account.graphVersion || "v23.0"}/${account.phoneNumberId}/media`;
  const stats = fs.statSync(filePath);
  console.log(`[PDF UPLOAD] URL: ${url}, file: ${filePath}, size: ${stats.size} bytes`);
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", fs.createReadStream(filePath));
  form.append("type", "application/pdf");

  const response = await axios.post(url, form, {
    headers: { Authorization: `Bearer ${account.accessToken}`, ...form.getHeaders() },
  });
  console.log(`[PDF UPLOAD] Response:`, JSON.stringify(response.data));
  return response.data;
};

export const MetaWhatsAppService = {
  normalizePhone,
  uploadMedia,

  async sendTemplate({ account, to, templateName, language, components }) {
    const url = `https://graph.facebook.com/${account.graphVersion || "v23.0"}/${account.phoneNumberId}/messages`;
    const payload: any = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language || "en_US" },
        ...(components?.length ? { components } : {}),
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return { payload, data: response.data };
  },

  async sendDocument({ account, to, filePath, caption }) {
    const media = await uploadMedia(account, filePath);
    const mediaId = media?.id;
    console.log(`[PDF SEND] mediaId: ${mediaId}, to: ${to}`);
    if (!mediaId) throw new Error("Failed to upload document to Meta");

    const url = `https://graph.facebook.com/${account.graphVersion || "v23.0"}/${account.phoneNumberId}/messages`;
    const payload: any = {
      messaging_product: "whatsapp",
      to,
      type: "document",
      document: { id: mediaId },
    };
    if (caption) payload.document.caption = caption;

    console.log(`[PDF SEND] URL: ${url}, payload:`, JSON.stringify(payload));
    const response = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${account.accessToken}`, "Content-Type": "application/json" },
    });
    console.log(`[PDF SEND] Response:`, JSON.stringify(response.data));
    return { payload, data: response.data };
  },

  async createTemplate({ account, name, language, category, components }) {
    const url = `https://graph.facebook.com/${account.graphVersion || "v23.0"}/${account.businessAccountId}/message_templates`;
    const payload = { name, language, category, components };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return { payload, data: response.data };
  },

  async listTemplates(account) {
    const url = `https://graph.facebook.com/${account.graphVersion || "v23.0"}/${account.businessAccountId}/message_templates`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    return response.data;
  },

  async deleteTemplate(account, metaTemplateId) {
    const url = `https://graph.facebook.com/${account.graphVersion || "v23.0"}/${metaTemplateId}`;
    const response = await axios.delete(url, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    return response.data;
  },
};
