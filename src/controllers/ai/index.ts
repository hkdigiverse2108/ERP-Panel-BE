import axios from "axios";
import { apiResponse, HTTP_STATUS } from "../../common";
import { credentialModel, monthlySpecialModel, productModel } from "../../database";
import { reqInfo, responseMessage } from "../../helper";

export const analyzeTable = async (req, res) => {
  reqInfo(req);
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No image provided", {}, {}));
    }

    // 1. Get next available credential (Rotation logic)
    const credential = await credentialModel.findOne({ isDeleted: false, isActive: true }).sort({ lastUsed: 1 });

    if (!credential) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(new apiResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, "No AI credentials available. Please add them in the panel.", {}, {}));
    }

    // Update lastUsed timestamp for rotation
    credential.lastUsed = new Date();
    await credential.save();

    // 2. Fetch inventory for the prompt
    // In this ERP, products are scoped by company. 
    // Since these are global specials, we might want to include them too.
    const [products, specials] = await Promise.all([
      productModel.find({ isDeleted: false, isActive: true }).select("name sku sellingPrice"),
      monthlySpecialModel.find({ isDeleted: false, isActive: true }).select("name price"),
    ]);

    const productList = products.map(p => `- ${p.name} (SKU: ${(p as any).sku}, ₹${(p as any).sellingPrice})`).join("\n");
    const specialsList = specials.map(s => `- ${s.name} (₹${s.price})`).join("\n");

    const systemPrompt = `You are a billing assistant for an Indian shopkeeper. You analyze photos of items on a table and identify them.

MASTER INVENTORY:
${productList || "No products in inventory yet."}

SPECIALS (PRIORITY - match these first!):
${specialsList || "No specials."}

Instructions:
1. Look at the image and identify all visible items on the table.
2. Match each item to the master inventory or specials list. Specials take priority.
3. Estimate quantities for each item.
4. If an item is not in the inventory, still list it with "UNKNOWN" as the price.

Respond ONLY with a JSON array. Each object must have:
- "name": string (product name from inventory, or best guess)
- "price": number (price from inventory, or 0 if unknown)
- "quantity": number (estimated count)
- "matched": boolean (true if found in inventory/specials)
- "sku_code": string (from inventory, or "N/A")

Example: [{"name":"Rice 1kg","price":45,"quantity":2,"matched":true,"sku_code":"RICE001"}]`;

    // 3. Call the Supabase Edge Function using the rotated credential
    // The user wants to use multiple API credentials. 
    // Usually, the AI logic identifies the items.
    
    const supabaseUrl = credential.supabaseUrl;
    const supabaseKey = credential.publishableKey;
    const analyzeFunctionUrl = `${supabaseUrl}/functions/v1/analyze-table`;

    const aiResponse = await axios.post(analyzeFunctionUrl, {
      imageBase64,
      systemPrompt // Overriding or providing the prompt to the edge function if it supports it
    }, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "AI analysis successful", aiResponse.data, {}));

  } catch (error) {
    console.error("AI analysis error:", error.response?.data || error.message);
    const status = error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return res.status(status).json(new apiResponse(status, error.message || responseMessage?.internalServerError, {}, error.response?.data || error));
  }
};
