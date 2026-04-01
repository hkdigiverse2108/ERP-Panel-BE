import { createClient } from "@supabase/supabase-js";
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

    // Strip the dataURI prefix (e.g., "data:image/jpeg;base64,")
    const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    
    console.log(`Analyzing image (stripped length: ${rawBase64.length} chars, ~${Math.round(rawBase64.length / 1024)} KB)`);

    // 1. Get next available credential (Rotation logic)
    const credential = await credentialModel.findOne({ isDeleted: false, isActive: true }).sort({ lastUsed: 1 });

    if (!credential) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(new apiResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, "No AI credentials available. Please add them in the panel.", {}, {}));
    }

    // Update lastUsed timestamp for rotation
    credential.lastUsed = new Date();
    await credential.save();

    // 2. Fetch inventory for the prompt
    const [products, specials] = await Promise.all([
      productModel.find({ isDeleted: false, isActive: true }).select("name sku sellingPrice"),
      monthlySpecialModel.find({ isDeleted: false, isActive: true }).select("name price"),
    ]);

    // Limit inventory if too large for prompt
    const LIMIT = 100; 
    const truncatedProducts = products.slice(0, LIMIT);
    if (products.length > LIMIT) console.log(`Notice: Truncating inventory from ${products.length} to ${LIMIT} for prompt context.`);

    const productList = truncatedProducts.map(p => `- ${p.name} (SKU: ${(p as any).sku}, ₹${(p as any).sellingPrice})`).join("\n");
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
    const supabaseUrl = credential.supabaseUrl;
    const supabaseKey = credential.publishableKey;
    
    // Create direct supabase client for function invocation
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error: functionError } = await supabase.functions.invoke("analyze-table", {
      body: { 
        imageBase64: rawBase64,
        systemPrompt 
      },
    });

    if (functionError) {
        console.error("AI gateway error:", functionError);
        throw functionError;
    }

    // Ensure we return an array (handle both [items: []] and direct array)
    const resultItems = Array.isArray(data) ? data : (data?.items || []);
    console.log(`AI Analysis complete. Detected ${resultItems.length} items.`);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "AI analysis successful", resultItems, {}));

  } catch (error: any) {
    const errorData = error.response?.data || error.message || error;
    console.error("AI analysis error details:", errorData);
    const status = error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return res.status(status).json(new apiResponse(status, error.message || responseMessage?.internalServerError, {}, errorData));
  }
};
