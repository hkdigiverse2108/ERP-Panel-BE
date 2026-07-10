import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export const sendUtilityMessage = async (config: { pageId: string; pageAccessToken: string }, psid: string, templateName: string, variables: Record<string, string>) => {
  const response = await axios.post(
    `${GRAPH_BASE_URL}/me/messages`,
    {
      messaging_type: "MESSAGE_TAG",
      recipient: { id: psid },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "utility",
            template_name: templateName,
            language: { policy: "deterministic", code: "en" },
            components: Object.keys(variables).length ? [{ type: "body", parameters: Object.entries(variables).map(([key, val]) => ({ type: "text", text: val })) }] : undefined,
          },
        },
      },
      tag: "utility",
    },
    { params: { access_token: config.pageAccessToken } },
  );
  return response.data;
};

export const verifyWebhookSignature = (appSecret: string, rawBody: string, signature: string): boolean => {
  if (!signature) return false;
  const expectedSignature = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expected = `sha256=${expectedSignature}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

export const createTemplateOnMeta = async (config: { pageId: string; pageAccessToken: string }, templateDoc: {
  name: string;
  language: string;
  category: string;
  header: { format: string; text?: string; imageHandle?: string };
  bodyText: string;
  buttons: Array<{ type: string; text: string; url?: string; phoneNumber?: string; payload?: string }>;
}) => {
  const components: any[] = [];

  if (templateDoc.header.format !== "NONE") {
    const headerComponent: any = { type: "HEADER", format: templateDoc.header.format };
    if (templateDoc.header.format === "TEXT" && templateDoc.header.text) {
      headerComponent.text = templateDoc.header.text;
    }
    if (templateDoc.header.format === "IMAGE" && templateDoc.header.imageHandle) {
      headerComponent.example = { header_handle: [templateDoc.header.imageHandle] };
    }
    components.push(headerComponent);
  }

  const bodyComponent: any = { type: "BODY", text: templateDoc.bodyText };
  const variables = templateDoc.bodyText.match(/\{\{(\w+)\}\}/g);
  if (variables) {
    bodyComponent.example = { body_text: [[...variables.map((v: string) => v.replace(/[{}]/g, ""))]] };
  }
  components.push(bodyComponent);

  if (templateDoc.buttons?.length) {
    const buttonsComponent: any = { type: "BUTTONS", buttons: [] };
    for (const btn of templateDoc.buttons) {
      if (btn.type === "url") {
        buttonsComponent.buttons.push({ type: "URL", title: btn.text, url: btn.url });
      } else if (btn.type === "phone_number") {
        buttonsComponent.buttons.push({ type: "PHONE_NUMBER", title: btn.text, phone_number: btn.phoneNumber });
      } else {
        buttonsComponent.buttons.push({ type: "QUICK_REPLY", title: btn.text, payload: btn.payload || btn.text });
      }
    }
    components.push(buttonsComponent);
  }

  const response = await axios.post(
    `${GRAPH_BASE_URL}/${config.pageId}/message_templates`,
    {
      name: templateDoc.name,
      language: templateDoc.language,
      category: templateDoc.category,
      components,
    },
    { params: { access_token: config.pageAccessToken } },
  );
  return response.data;
};

export const deleteTemplateOnMeta = async (config: { pageId: string; pageAccessToken: string }, metaTemplateId: string) => {
  const response = await axios.delete(
    `${GRAPH_BASE_URL}/${config.pageId}/message_templates`,
    {
      params: { access_token: config.pageAccessToken, template_id: metaTemplateId },
    },
  );
  return response.data;
};

export const refreshTemplateStatus = async (config: { pageId: string; pageAccessToken: string }, metaTemplateId?: string) => {
  const params: any = { access_token: config.pageAccessToken, fields: "id,name,status,language,category,rejection_reason" };
  if (metaTemplateId) {
    params.template_id = metaTemplateId;
  }
  const response = await axios.get(
    `${GRAPH_BASE_URL}/${config.pageId}/message_templates`,
    { params },
  );
  return response.data;
};

export const uploadTemplateImageHandle = async (config: { pageAccessToken: string }, imageBuffer: Buffer, contentType: string) => {
  const form = new FormData();
  form.append("file", imageBuffer, { filename: "template-image", contentType });
  form.append("access_token", config.pageAccessToken);
  const response = await axios.post(`${GRAPH_BASE_URL}/me/uploads`, form, {
    headers: { ...form.getHeaders() },
  });
  return response.data;
};
