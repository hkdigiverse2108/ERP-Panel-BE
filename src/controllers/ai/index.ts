import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { apiResponse, HTTP_STATUS } from "../../common";
import { credentialModel, monthlySpecialModel, productModel } from "../../database";
import { redisGet, redisSet, reqInfo, responseMessage } from "../../helper";

// Helper to normalize strings for better matching (strips symbols and extra spaces, handles units)
const normalize = (str: string) => {
  if (!str) return "";
  // Handle specific cases like "Chana - Dal" -> "Chana Dal"
  // Lowercase, remove special chars, handle common unit spacing (e.g. "200 gm" -> "200gm")
  return str.toLowerCase()
    .replace(/(\d+)\s*(gm|g|kg|ml|l|pcs|pc)\b/g, "$1$2")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

export const analyzeTable = async (req, res) => {
  reqInfo(req);
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "No image provided", {}, {}));
    }

    // Strip the dataURI prefix (e.g., "data:image/jpeg;base64,")
    const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const cacheKey = `ai:analyze:image:${crypto.createHash("sha256").update(rawBase64).digest("hex")}`;
    const cachedData = await redisGet(cacheKey);
    if (cachedData) {
      return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "AI analysis successful", cachedData, {}));
    }

    console.log(`Analyzing image (stripped length: ${rawBase64.length} chars, ~${Math.round(rawBase64.length / 1024)} KB)`);

    // 1. Get next available credential (Rotation logic)
    const credential = await credentialModel.findOne({ isDeleted: false, isActive: true }).sort({ lastUsed: 1 });

    if (!credential) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(new apiResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, "No AI credentials available. Please add them in the panel.", {}, {}));
    }

    // Update lastUsed timestamp for rotation
    credential.lastUsed = new Date();
    await credential.save();

    // 2. Fetch FULL inventory for matching
    const [products, specials] = await Promise.all([
      productModel.find({ isDeleted: false, isActive: true }).select("_id name sku sellingPrice"),
      monthlySpecialModel.find({ isDeleted: false, isActive: true }).select("name price"),
    ]);

    console.log(`DB Context: ${products.length} products, ${specials.length} specials found.`);

    // 3. Prepare prompt with limited list (to stay within token limits)
    // We sort alphabetically to give a consistent context
    const PROMPT_LIMIT = 100;
    const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));
    const truncatedProducts = sortedProducts.slice(0, PROMPT_LIMIT);

    const productList = truncatedProducts.map(p => `- ${p.name} | SKU: ${(p as any).sku} (₹${(p as any).sellingPrice})`).join("\n");
    const specialsList = specials.map(s => `- ${s.name} (₹${s.price})`).join("\n");

    const systemPrompt = `
You are a billing assistant for an Indian shopkeeper. You analyze photos of items on a table and identify them.

MASTER INVENTORY (Sample/Priority):
${productList || "No products in inventory yet."}

SPECIALS (PRIORITY - match these first):
${specialsList || "No specials."}

Instructions:
1. Look at the image and identify all visible items.
2. Match each item to inventory using its Name or SKU. Both are equally valid identifiers.
3. Estimate quantity.
4. Extract price from inventory. If not found, try to detect from image.

IMPORTANT SKU RULE:
- SKU must ALWAYS be returned.
- If item exists in inventory → use its EXACT SKU
- If NOT found → GENERATE SKU using:
  PRODUCT NAME + PRICE
- Format:
  UPPERCASE + DASH (-)
- Example:
  BALAJI-CRUNCHEX-SIMPLY-SALTED-40

Respond ONLY in JSON:
[
  {
    "name": "",
    "price": number,
    "quantity": number,
    "matched": boolean,
    "sku_code": string
  }
]
`;

    // 4. Call Supabase Edge Function
    const supabaseUrl = credential.supabaseUrl;
    const supabaseKey = credential.publishableKey;
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

    // 5. Post-Process & Enrich Results against FULL Database

    const aiItems = Array.isArray(data) ? data : (data?.items || []);
    const enrichedItems = aiItems.map((item: any) => {
      const aiName = item.name || "";
      const aiSku = item.sku_code || "";
      const normalizedAiName = normalize(aiName);
      const normalizedAiSku = normalize(aiSku);

      // A. Match against Specials (Priority)
      const matchedSpecial = specials.find(s =>
        normalize(s.name) === normalizedAiName ||
        normalize(s.name) === normalizedAiSku
      );

      if (matchedSpecial) {
        return {
          ...item,
          name: matchedSpecial.name,
          price: matchedSpecial.price,
          matched: true,
          sku_code: "SPECIAL"
        };
      }

      // B. Match against Products (Treat Name and SKU as 'Both Same')
      const matchedProduct = products.find(p => {
        const normalizedDbName = normalize(p.name || "");
        const normalizedDbSku = normalize((p as any).sku || "");

        // 1. Exact Identity Matches (Checks AI Name against DB SKU, and AI SKU against DB Name)
        return normalizedDbName === normalizedAiName ||
          normalizedDbSku === normalizedAiSku ||
          normalizedDbName === normalizedAiSku ||
          normalizedDbSku === normalizedAiName;
      });

      if (matchedProduct) {
        return {
          ...item,
          name: matchedProduct.name,
          price: (matchedProduct as any).sellingPrice || 0,
          matched: true,
          product_id: matchedProduct._id,
          sku_code: (matchedProduct as any).sku || "N/A"
        };
      }

      return item;
    });

    // console.log(`AI Analysis complete. Detected ${enrichedItems.length} items. Resolved matches via keyword overlap.`);
    // console.log("aiItems =>", enrichedItems);

    await redisSet(cacheKey, enrichedItems, 1800);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "AI analysis successful", enrichedItems, {}));

  } catch (error: any) {
    const errorData = error.response?.data || error.message || error;
    console.error("AI analysis error details:", errorData);
    const status = error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return res.status(status).json(new apiResponse(status, error.message || responseMessage?.internalServerError, {}, errorData));
  }
};
