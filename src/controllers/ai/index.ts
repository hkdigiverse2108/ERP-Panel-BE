import { createClient } from "@supabase/supabase-js";
import { apiResponse, HTTP_STATUS } from "../../common";
import { credentialModel, monthlySpecialModel, productModel } from "../../database";
import { reqInfo, responseMessage } from "../../helper";

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

// Extract numbers from a string (e.g. "Chana Dal 500gm" -> ["500"])
const getNumbers = (str: string) => {
    return (str.match(/\d+/g) || []).map(Number);
};

// Helper for strict matching
const isMatch = (dbValue: string, aiValue: string) => {
    const s1 = normalize(dbValue);
    const s2 = normalize(aiValue);
    if (!s1 || !s2) return false;

    // 1. Exact Normalized equality (Best match)
    if (s1 === s2) return true;

    // 2. Strict Numeric Check: If both strings have numbers but they differ, reject.
    const nums1 = getNumbers(dbValue);
    const nums2 = getNumbers(aiValue);
    // 3. Keyword / Inclusion (Only if numeric compatibility above passes or if no numbers present)
    if (s1.length > 2 && s2.length > 2) {
        if (s1.includes(s2) || s2.includes(s1)) return true;
    }

    // 4. Word overlap (for cases like "B4 Baker's Chana Dal" vs "Chana Dal")
    const words1 = dbValue.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
    const words2 = aiValue.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return false;

    // A. Subset Match (Strong): If ALL database words are present in the AI string, match it.
    // This allows "B4 Bakers Chana Dal" to match "Chana Dal" even if weights (200g vs 500g) differ.
    const allDbWordsMatch = words1.every(dbW => words2.some(aiW => aiW.includes(dbW) || dbW.includes(aiW)));
    if (allDbWordsMatch) return true;

    // B. Partial Overlap Match
    const matchCount = words2.filter(w => words1.some(dbW => dbW.includes(w) || w.includes(dbW))).length;
    const matchRate = matchCount / words2.length;

    return matchRate >= 0.75; 
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
    const sortedProducts = [...products].sort((a,b) => a.name.localeCompare(b.name));
    const truncatedProducts = sortedProducts.slice(0, PROMPT_LIMIT);
    
    const productList = truncatedProducts.map(p => `- ${p.name} (SKU: ${(p as any).sku}, ₹${(p as any).sellingPrice})`).join("\n");
    const specialsList = specials.map(s => `- ${s.name} (₹${s.price})`).join("\n");

    const systemPrompt = `You are a billing assistant for an Indian shopkeeper. You analyze photos of items on a table and identify them.

MASTER INVENTORY (Sample/Priority):
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
    console.log("aiItems > ",aiItems);
    const enrichedItems = aiItems.map((item: any) => {
        const itemNameLower = item.name?.toLowerCase().trim();
        const itemSkuLower = item.sku_code?.toLowerCase().trim();
        const normalizedItemName = normalize(item.name);

        // A. Match against Specials (Priority)
        const matchedSpecial = specials.find(s => 
            s.name?.toLowerCase().trim() === itemNameLower || 
            normalize(s.name) === normalizedItemName || 
            isMatch(s.name, item.name)
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

        // B. Match against Products (Name or SKU)
        // 1. First Pass: Exact Match
        let matchedProduct = products.find(p => 
            p.name?.toLowerCase().trim() === itemNameLower || 
            (p as any).sku?.toLowerCase().trim() === itemSkuLower ||
            (p as any).sku?.toLowerCase().trim() === itemNameLower // AI sometimes swaps name and SKU
        );

        // 2. Second Pass: Normalized Fuzzy Match (Checks Name and SKU)
        if (!matchedProduct) {
            matchedProduct = products.find(p => {
                const nameMatch = normalize(p.name) === normalizedItemName || isMatch(p.name, item.name);
                if (nameMatch) return true;

                // SKU Fuzzy match ONLY if SKU is not a single character/tiny code
                const sku = p.sku || "";
                if (sku.length > 2) {
                    return normalize(sku) === normalizedItemName || isMatch(sku, item.name);
                }
                return false;
            });
        }
        
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

    console.log(`AI Analysis complete. Detected ${enrichedItems.length} items. Resolved matches via keyword overlap.`);
    console.log("aiItems =>", enrichedItems);

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, "AI analysis successful", enrichedItems, {}));

  } catch (error: any) {
    const errorData = error.response?.data || error.message || error;
    console.error("AI analysis error details:", errorData);
    const status = error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return res.status(status).json(new apiResponse(status, error.message || responseMessage?.internalServerError, {}, errorData));
  }
};
