# ERP-Panel-BE — Product Variants & Barcode Update Plan (Revised)

> Built after reading: product model/types/validation/controller · stock model/validation/controller · stockHelper · posOrder model/controller · purchaseOrder model

---

## 1. How the System Actually Works Today

This is critical to understand before touching anything.

### Product vs Stock — the real split

| What lives on **Product** | What lives on **Stock** |
|---|---|
| Identity: name, SKU, category, brand, images, description | **All pricing**: mrp, sellingPrice, purchasePrice, landingCost, discounts, margins |
| Flags: hasExpiry, manageMultipleBatch, productType | **qty** (the live quantity) |
| Metadata: hsnCode, nutrition, ingredients | **UOM** (unit of measure) |
| `stockIds[]` — backlinks to its stock records | **Tax** (purchaseTaxId, salesTaxId, including flags) |
| | **branch + company scoping** |

**Key insight:** The product document itself has price fields (mrp, sellingPrice, etc.) but those are **dead/default values**. Every response that matters (`getAllProduct`, `getProductDropdown`, `getOneProduct`, POS order fetch) **throws those away and reads pricing + qty from the Stock collection** instead. The stock is the single source of truth for anything transactional.

### The Stock record per product

One `stock` document = one product × one branch × one company (currently).  
`addStock` checks: if a stock record already exists for `{productId, companyId, branchId}`, it **updates it** rather than creating a second one. So there is at most one stock row per product-per-branch right now.

`variantId` is already a field in the stock schema — it was stubbed but never populated or used anywhere.

### How qty moves

| Event | What happens to stock.qty |
|---|---|
| `addStock` | Sets initial qty |
| POS order **created** (not cancelled) | `$inc qty -item.qty` per item, keyed on `{productId, branchId}` |
| POS order **edited** | Reverts old items (+qty), deducts new items (-qty) |
| POS order **deleted / cancelled** | Reverts qty (+qty) |
| `bulkStockAdjustment` | `$inc qty -item.qty` per item (consumption) |
| `editStock` | Manual deduction |

### How the stock query is keyed in POS

```js
// addPosOrder / editPosOrder stock update
stockModel.findOneAndUpdate(
  { productId: item.productId, branchId: response.branchId, isDeleted: false },
  { $inc: { qty: -item.qty } }
)
```

`stockHelper.checkStockQty` also queries only on `{productId, branchId}`.  
**There is no variantId in any of these queries today.**

### How POS order items are stored

`posItemSchema` has: `productId, qty, mrp, discountAmount, unitCost, netAmount, returnedQty`.  
**No variantId field exists on the order item today.**

---

## 2. What "Adding Variants" Actually Means

A variant is a **sub-product** — e.g. "T-Shirt / Red / L". It needs:
- Its own **identity** (name, barcode, attributes like color/size)
- Its own **stock record** (separate qty, pricing per branch)
- Its own **order line item** reference

This means the variant is not just metadata on the product document. It needs to be a **first-class identifier** that flows through stock and orders — just like productId does today, but scoped to a specific combination.

The `variantId` stub in the stock model is the right hook — it just needs to be wired everywhere productId is used.

---

## 3. Full Change Map

### Layer 1 — Enums (`src/common/enum.ts`)
Add `BARCODE_TYPE`.

### Layer 2 — Types (`src/types/product.ts`)
Add `IProductVariant` interface. Update `IProduct` to include `variants[]` + top-level `barcode`.

### Layer 3 — Product Model (`src/database/model/product.ts`)
Add `variantSchema` sub-document embedded in productSchema. Add `barcode` field.

### Layer 4 — Stock Model (`src/database/model/stock.ts`)
`variantId` already exists in schema and interface. No model change needed — just needs to be **used** in queries.

### Layer 5 — Product Validation (`src/validation/product.ts`)
Add `variants[]` and `barcode` to add/edit schemas.

### Layer 6 — Stock Validation (`src/validation/stock.ts`)
`variantId` already exists in `addStockSchema` and `editStockSchema`. No change needed.

### Layer 7 — Product Controller (`src/controllers/product/index.ts`)
- `addProduct` — barcode duplicate check
- `editProduct` — variant add/update/remove, barcode duplicate check
- `getAllProduct` — pass variantId through aggregation
- `getOneProduct` — attach per-variant stock breakdown
- `getProductDropdown` — add `barcodeSearch` param
- New `getByBarcode` function

### Layer 8 — Stock Controller (`src/controllers/stock/index.ts`)
- `addStock` — when `variantId` is present, the uniqueness key becomes `{productId, variantId, companyId, branchId}` not just `{productId, companyId, branchId}`
- `getAllStock` — group by `{productId, variantId}` not just `productId`
- `getOneStock` — return per-variant stock breakdown
- `bulkStockAdjustment` — accept and match `variantId` on items

### Layer 9 — Stock Helper (`src/helper/stockHelper.ts`)
`checkStockQty` — when item has a `variantId`, include it in the stock lookup query.

### Layer 10 — POS Order Model (`src/database/model/posOrder.ts`)
Add `variantId` to `posItemSchema`.

### Layer 11 — POS Order Controller (`src/controllers/posOrder/index.ts`)
All three places that do `stockModel.findOneAndUpdate({productId, branchId}, ...)` need to also match on `variantId` when present.

### Layer 12 — Routes (`src/routes/product.ts`)
Add `GET /barcode/:code`.

---

## 4. Step-by-Step Execution Order

| Step | Layer | Action |
|---|---|---|
| 1 | Enum | Add `BARCODE_TYPE` |
| 2 | Types | Add `IProductVariant`, update `IProduct` |
| 3 | Product Model | Add `variantSchema` + `barcode` to product |
| 4 | Product Validation | Add variants + barcode to Joi schemas |
| 5 | Product Controller | addProduct barcode check |
| 6 | Product Controller | editProduct variant management |
| 7 | Product Controller | getAllProduct / getOneProduct variant-aware |
| 8 | Product Controller | getProductDropdown barcode search |
| 9 | Product Controller | new getByBarcode function |
| 10 | Stock Controller | addStock variant-keyed uniqueness |
| 11 | Stock Controller | getAllStock + getOneStock variant-aware |
| 12 | Stock Controller | bulkStockAdjustment variantId support |
| 13 | Stock Helper | checkStockQty variantId match |
| 14 | POS Order Model | add variantId to posItemSchema |
| 15 | POS Order Controller | wire variantId in all stock $inc operations |
| 16 | Routes | register /barcode/:code |

---

## 5. Prompts — Ready to Use

---

### PROMPT 1 — Enum

```
You are working on a Node.js / TypeScript ERP backend.
File: src/common/enum.ts

Add a new exported const enum called BARCODE_TYPE after the existing enums.
Values: EAN_13, EAN_8, UPC_A, UPC_E, QR_CODE, CODE_128, CUSTOM.
Follow the exact same `as const` pattern already used in the file.
Do NOT change any existing enum.
Return only the updated full file content.
```

---

### PROMPT 2 — Types

```
You are working on a Node.js / TypeScript ERP backend.
File: src/types/product.ts   (paste full current content)

Tasks:
1. Add a new exported interface IProductVariant:
   _id?: Schema.Types.ObjectId
   name: string                         // e.g. "Red / L"
   sku?: string
   itemCode?: string
   barcode?: string
   barcodeType?: string                 // value from BARCODE_TYPE enum
   attributes?: { key: string; value: string }[]  // e.g. [{key:"color",value:"Red"},{key:"size",value:"L"}]
   mrp?: number
   sellingPrice?: number
   purchasePrice?: number
   isActive?: boolean

2. In IProduct add:
   barcode?: string
   barcodeType?: string
   variants?: IProductVariant[]

Do NOT remove or rename any existing field.
Return only the updated full file content.
```

---

### PROMPT 3 — Product Model

```
You are working on a Node.js / TypeScript ERP backend.
File: src/database/model/product.ts   (paste full current content)

Tasks:
1. Import BARCODE_TYPE from "../../common".

2. Create a variantSchema (a Schema object, NOT a model) before productSchema:
   name: { type: String, required: true }
   sku: { type: String, sparse: true }
   itemCode: { type: String }
   barcode: { type: String, sparse: true }
   barcodeType: { type: String, enum: Object.values(BARCODE_TYPE) }
   attributes: [{ key: { type: String }, value: { type: String } }]
   mrp: { type: Number, default: 0 }
   sellingPrice: { type: Number, default: 0 }
   purchasePrice: { type: Number, default: 0 }
   isActive: { type: Boolean, default: true }

3. In productSchema add these two fields:
   barcode: { type: String, index: true, sparse: true }
   barcodeType: { type: String, enum: Object.values(BARCODE_TYPE) }
   variants: { type: [variantSchema], default: [] }

Do NOT change any existing field.
Return only the updated full file content.
```

---

### PROMPT 4 — Product Validation

```
You are working on a Node.js / TypeScript ERP backend.
File: src/validation/product.ts   (paste full current content)

Also import BARCODE_TYPE from "../common".

Tasks — update three schemas:

A. addProductSchema — add these optional fields:
   barcode: Joi.string().optional().allow("", null)
   barcodeType: Joi.string().valid(...Object.values(BARCODE_TYPE)).optional()
   variants: Joi.array().items(
     Joi.object({
       name: Joi.string().required(),
       sku: Joi.string().optional(),
       itemCode: Joi.string().optional(),
       barcode: Joi.string().optional().allow("", null),
       barcodeType: Joi.string().valid(...Object.values(BARCODE_TYPE)).optional(),
       attributes: Joi.array().items(
         Joi.object({ key: Joi.string().required(), value: Joi.string().required() })
       ).optional(),
       mrp: Joi.number().min(0).default(0).optional(),
       sellingPrice: Joi.number().min(0).default(0).optional(),
       purchasePrice: Joi.number().min(0).default(0).optional(),
       isActive: Joi.boolean().default(true).optional(),
     })
   ).optional()

B. editProductSchema — add the same barcode + barcodeType fields, plus:
   variants: Joi.array().items(
     Joi.object({
       _id: Joi.string().optional(),   // present = update existing variant
       name: Joi.string().optional(),
       sku: Joi.string().optional(),
       itemCode: Joi.string().optional(),
       barcode: Joi.string().optional().allow("", null),
       barcodeType: Joi.string().valid(...Object.values(BARCODE_TYPE)).optional(),
       attributes: Joi.array().items(
         Joi.object({ key: Joi.string().required(), value: Joi.string().required() })
       ).optional(),
       mrp: Joi.number().min(0).optional(),
       sellingPrice: Joi.number().min(0).optional(),
       purchasePrice: Joi.number().min(0).optional(),
       isActive: Joi.boolean().optional(),
     })
   ).optional()
   removeVariantIds: Joi.array().items(Joi.string()).optional()

C. addBulkProductSchema — add only:
   barcode: Joi.string().optional().allow("", null)
   barcodeType: Joi.string().valid(...Object.values(BARCODE_TYPE)).optional()
   (Bulk import does not support variants.)

Do NOT change any existing field or rule.
Return only the updated full file content.
```

---

### PROMPT 5 — Product Controller: addProduct barcode check

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/product/index.ts   — paste ONLY the addProduct function.

After the existing name-duplicate check block, add two new checks:

CHECK 1 — product-level barcode:
  if (value.barcode) {
    const barcodeCriteria: any = { barcode: value.barcode, isDeleted: false };
    if (value.companyId) barcodeCriteria.companyId = value.companyId;
    const barcodeExists = await getFirstMatch(productModel, barcodeCriteria, {}, {});
    if (barcodeExists) return res.status(HTTP_STATUS.CONFLICT).json(
      new apiResponse(HTTP_STATUS.CONFLICT, "A product with this barcode already exists", {}, {})
    );
  }

CHECK 2 — variant-level barcodes:
  if (value.variants && value.variants.length > 0) {
    for (const variant of value.variants) {
      if (variant.barcode) {
        const variantBarcodeCriteria: any = { "variants.barcode": variant.barcode, isDeleted: false };
        if (value.companyId) variantBarcodeCriteria.companyId = value.companyId;
        const variantBarcodeExists = await getFirstMatch(productModel, variantBarcodeCriteria, {}, {});
        if (variantBarcodeExists) return res.status(HTTP_STATUS.CONFLICT).json(
          new apiResponse(HTTP_STATUS.CONFLICT, `Variant barcode '${variant.barcode}' already exists on another product`, {}, {})
        );
      }
    }
  }

Everything else stays identical.
Return only the updated addProduct function.
```

---

### PROMPT 6 — Product Controller: editProduct variant management

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/product/index.ts   — paste ONLY the editProduct function.

After the existing ownership check and before the name duplicate check, add:

BARCODE CHECK (exclude current product):
  if (value.barcode) {
    const barcodeCriteria: any = { barcode: value.barcode, isDeleted: false, _id: { $ne: value.productId } };
    if (companyId) barcodeCriteria.companyId = companyId;
    const barcodeExists = await getFirstMatch(productModel, barcodeCriteria, {}, {});
    if (barcodeExists) return res.status(HTTP_STATUS.CONFLICT).json(
      new apiResponse(HTTP_STATUS.CONFLICT, "A product with this barcode already exists", {}, {})
    );
  }

VARIANT MANAGEMENT:
  Instead of setting variants directly in the update payload, handle them with MongoDB array operators:
  
  const updatePayload: any = { ...value };
  delete updatePayload.variants;
  delete updatePayload.removeVariantIds;

  // 1. Remove variants by _id if requested
  if (value.removeVariantIds && value.removeVariantIds.length > 0) {
    await updateData(productModel, { _id: value.productId }, 
      { $pull: { variants: { _id: { $in: value.removeVariantIds.map(id => new ObjectId(id)) } } } }, {}
    );
  }

  // 2. For each variant in the payload:
  //    - If it has an _id → update that sub-document using arrayFilters
  //    - If no _id → push as new variant
  if (value.variants && value.variants.length > 0) {
    for (const variant of value.variants) {
      if (variant._id) {
        // Update existing variant
        const variantUpdateFields: any = {};
        Object.keys(variant).forEach(k => {
          if (k !== '_id') variantUpdateFields[`variants.$[elem].${k}`] = variant[k];
        });
        await productModel.updateOne(
          { _id: value.productId },
          { $set: variantUpdateFields },
          { arrayFilters: [{ "elem._id": new ObjectId(variant._id) }] }
        );
      } else {
        // Add new variant
        await productModel.updateOne(
          { _id: value.productId },
          { $push: { variants: variant } }
        );
      }
    }
  }

  // 3. Apply the rest of the update (non-variant fields)
  updatePayload.updatedBy = user?._id || null;
  const response = await updateData(productModel, { _id: value.productId }, updatePayload, {});

Keep all existing checks (name duplicate, ownership). Remove the old `value.updatedBy` + updateData call and replace with the logic above.
Return only the updated editProduct function.
```

---

### PROMPT 7 — Product Controller: getAllProduct & getOneProduct variant-aware

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/product/index.ts   — paste ONLY getAllProduct and getOneProduct.

Changes needed:

In getAllProduct — inside the stockAggregation $group stage, add:
  variantId: { $first: "$variantId" }
In the $project stage add:
  variantId: 1
In the final productsWithStock map, add:
  variantId: stockAggregation.length > 0 ? stockAggregation[0].variantId : null

In getOneProduct — same additions to the aggregation (group + project).
In the final productsWithStock object add:
  variantId: stock.variantId ?? null

Additionally in getOneProduct, after building productsWithStock, add a variantsWithStock field:
  // Fetch all stock records for this product (all variants) in one query
  const allVariantStock = await stockModel.find({
    productId: response._id,
    isDeleted: false,
    ...(userType !== USER_TYPES.SUPER_ADMIN && companyId ? { companyId } : {}),
  }).populate([
    { path: "uomId", select: "name code" },
    { path: "purchaseTaxId", select: "name percentage" },
    { path: "salesTaxId", select: "name percentage" },
  ]);

  // Build a map keyed by variantId string
  const variantStockMap = allVariantStock.reduce((acc, s) => {
    if (s.variantId) acc[s.variantId.toString()] = s;
    return acc;
  }, {});

  // Attach stock to each variant in the product
  const variantsWithStock = (productsWithStock.variants || []).map((v: any) => {
    const vs = variantStockMap[v._id?.toString()];
    return {
      ...v,
      qty: vs?.qty ?? 0,
      mrp: vs?.mrp ?? v.mrp ?? 0,
      sellingPrice: vs?.sellingPrice ?? v.sellingPrice ?? 0,
      purchasePrice: vs?.purchasePrice ?? v.purchasePrice ?? 0,
      uomId: vs?.uomId ?? null,
      purchaseTaxId: vs?.purchaseTaxId ?? null,
      salesTaxId: vs?.salesTaxId ?? null,
    };
  });

  productsWithStock.variantsWithStock = variantsWithStock;

Return only the two updated functions.
```

---

### PROMPT 8 — Product Controller: getProductDropdown barcode search

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/product/index.ts   — paste ONLY the getProductDropdown function.

Add barcode lookup support:

1. Destructure barcodeSearch from req.query alongside the existing query params.

2. If barcodeSearch is present, short-circuit the entire function with this logic:

   let barcodeCriteria: any = {
     $or: [{ barcode: barcodeSearch }, { "variants.barcode": barcodeSearch }],
     isDeleted: false, isActive: true,
   };
   // Company scoping (same pattern already in the function)
   if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
     barcodeCriteria.$and = [{ $or: barcodeCriteria.$or }, { $or: [{ companyId }, { companyId: null }, { companyId: { $exists: false } }] }];
     delete barcodeCriteria.$or;
   }

   const product = await getFirstMatch(productModel, barcodeCriteria, {}, {});
   if (!product) {
     return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), [], {}));
   }

   // Determine matched variant (if any)
   const productObj = product.toObject ? product.toObject() : product;
   let matchedVariant = null;
   if (product.barcode !== barcodeSearch) {
     matchedVariant = (productObj.variants || []).find((v: any) => v.barcode === barcodeSearch) || null;
   }

   // Fetch stock — scoped to variant if matched
   const stockCriteria: any = { productId: product._id, isDeleted: false };
   if (effectiveCompanyId) stockCriteria.companyId = effectiveCompanyId;
   if (effectiveBranchId) stockCriteria.branchId = effectiveBranchId;
   if (matchedVariant) stockCriteria.variantId = matchedVariant._id;

   const stock = await stockModel.findOne(stockCriteria).populate([
     { path: "purchaseTaxId", select: "name percentage" },
     { path: "salesTaxId", select: "name percentage" },
     { path: "uomId", select: "name code" },
   ]);

   const result = {
     _id: product._id,
     name: product.name,
     productType: product.productType,
     matchedVariant,
     qty: stock?.qty ?? 0,
     mrp: stock?.mrp ?? matchedVariant?.mrp ?? productObj.mrp ?? 0,
     sellingPrice: stock?.sellingPrice ?? matchedVariant?.sellingPrice ?? productObj.sellingPrice ?? 0,
     sellingDiscount: stock?.sellingDiscount ?? productObj.sellingDiscount ?? 0,
     sellingMargin: stock?.sellingMargin ?? productObj.sellingMargin ?? 0,
     purchasePrice: stock?.purchasePrice ?? matchedVariant?.purchasePrice ?? productObj.purchasePrice ?? 0,
     landingCost: stock?.landingCost ?? productObj.landingCost ?? 0,
     purchaseTaxId: stock?.purchaseTaxId ?? null,
     salesTaxId: stock?.salesTaxId ?? null,
     isPurchaseTaxIncluding: stock?.isPurchaseTaxIncluding ?? false,
     isSalesTaxIncluding: stock?.isSalesTaxIncluding ?? false,
     uomId: stock?.uomId ?? null,
     branchId: stock?.branchId ?? null,
     images: productObj.images ?? [],
   };

   return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Product"), [result], {}));

3. If barcodeSearch is NOT present, the function behaves exactly as before.

Also: effectiveCompanyId and effectiveBranchId are already computed early in the function — 
make sure the barcode branch uses those same computed values.

Return only the updated getProductDropdown function.
```

---

### PROMPT 9 — Product Controller: new getByBarcode function

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/product/index.ts

Add a new exported async function getByBarcode(req, res).

This is the dedicated scan endpoint — used by POS when a barcode scanner fires.

Logic:
1. const code = req.params.code;
   const { user } = req.headers;
   const userType = user?.userType;
   const companyId = user?.companyId?._id;
   const branchId = user?.branchId?._id;

2. Build query:
   let criteria: any = {
     $or: [{ barcode: code }, { "variants.barcode": code }],
     isDeleted: false,
   };
   if (userType !== USER_TYPES.SUPER_ADMIN && companyId) {
     criteria.$and = [{ $or: criteria.$or }, { $or: [{ companyId }, { companyId: null }, { companyId: { $exists: false } }] }];
     delete criteria.$or;
   }

3. const product = await getFirstMatch(productModel, criteria, {}, {
     populate: [
       { path: "categoryId", select: "name" },
       { path: "brandId", select: "name" },
       { path: "productTypeId", select: "name" },
     ],
   });
   if (!product) return res.status(HTTP_STATUS.NOT_FOUND).json(
     new apiResponse(HTTP_STATUS.NOT_FOUND, responseMessage?.getDataNotFound("Product"), {}, {})
   );

4. Determine matchedVariant:
   const productObj = product.toObject ? product.toObject() : product;
   let matchedVariant = null;
   if (product.barcode !== code) {
     matchedVariant = (productObj.variants || []).find((v: any) => v.barcode === code) || null;
   }

5. Fetch stock:
   const stockCriteria: any = { productId: product._id, isDeleted: false };
   if (companyId) stockCriteria.companyId = new ObjectId(companyId.toString());
   if (branchId) stockCriteria.branchId = new ObjectId(branchId.toString());
   if (matchedVariant) stockCriteria.variantId = matchedVariant._id;

   const stock = await stockModel.findOne(stockCriteria).populate([
     { path: "uomId", select: "name code" },
     { path: "purchaseTaxId", select: "name percentage" },
     { path: "salesTaxId", select: "name percentage" },
     { path: "branchId", select: "name" },
   ]);

6. Return:
   {
     product: { ...productObj, variants: undefined },   // omit full variants array for brevity
     matchedVariant,
     stock: stock ? {
       qty: stock.qty,
       mrp: stock.mrp,
       sellingPrice: stock.sellingPrice,
       sellingDiscount: stock.sellingDiscount,
       purchasePrice: stock.purchasePrice,
       landingCost: stock.landingCost,
       uomId: stock.uomId,
       purchaseTaxId: stock.purchaseTaxId,
       salesTaxId: stock.salesTaxId,
       isPurchaseTaxIncluding: stock.isPurchaseTaxIncluding,
       isSalesTaxIncluding: stock.isSalesTaxIncluding,
       branchId: stock.branchId,
     } : null,
   }

Use the exact same apiResponse / HTTP_STATUS / responseMessage pattern as getOneProduct.
```

---

### PROMPT 10 — Stock Controller: addStock variant-keyed uniqueness

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/stock/index.ts   — paste ONLY the addStock function.

Currently the duplicate stock check uses:
  { productId: value?.productId, isDeleted: false, companyId, branchId }

Change it so that when value.variantId is present, the key also includes variantId:
  const existingStockCriteria: any = {
    productId: value?.productId,
    isDeleted: false,
  };
  if (value?.companyId) existingStockCriteria.companyId = value.companyId;
  if (value?.branchId) existingStockCriteria.branchId = value.branchId;
  if (value?.variantId) existingStockCriteria.variantId = value.variantId;
  // If no variantId provided, also exclude docs that have a variantId
  // (so a non-variant stock doesn't collide with variant stocks)
  if (!value?.variantId) existingStockCriteria.variantId = { $exists: false };

Everything else in the function stays the same.
Return only the updated addStock function.
```

---

### PROMPT 11 — Stock Controller: getAllStock & getOneStock variant-aware

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/stock/index.ts   — paste ONLY getAllStock and getOneStock.

Changes:

In getAllStock — the aggregation pipeline currently groups by productId only.
Change $group to group by both productId AND variantId:
  _id: { productId: "$productId", variantId: "$variantId" }

In the stockByProduct.forEach loop, key on both:
  const key = `${s._id.productId}_${s._id.variantId || ""}`;
  qtyByProductId[key] = s.totalQty;
  branchByProductId[key] = s.branchData;

In the final stockData map, when building each row:
  const key = `${product._id}_${product.variantId || ""}`;
  availableQty: qtyByProductId[key] ?? 0,
  branchId: branchByProductId[key] ?? null,

Note: productIdsWithStock must now collect the productId values:
  const productIdsWithStock = stockByProduct.map((s: any) => s._id.productId);

In getOneStock — the response currently returns:
  { product, stockRecords, availableQty }
Add a variantsStock field:
  // Group stockRecords by variantId
  const variantsStock = stockRecords.reduce((acc: any, s: any) => {
    if (s.variantId) {
      const key = s.variantId.toString();
      if (!acc[key]) acc[key] = { variantId: s.variantId, qty: 0 };
      acc[key].qty += s.qty || 0;
    }
    return acc;
  }, {});
  
  response = { product, stockRecords, availableQty: totalQty, variantsStock: Object.values(variantsStock) };

Return only the two updated functions.
```

---

### PROMPT 12 — Stock Controller: bulkStockAdjustment variantId support

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/stock/index.ts   — paste ONLY the bulkStockAdjustment function.
Also paste the bulkStockAdjustmentSchema from src/validation/stock.ts.

Changes needed:

1. In bulkStockAdjustmentSchema (validation), update the items array to also accept variantId:
   items: Joi.array().items(
     Joi.object({
       productId: objectId().required(),
       variantId: objectId().optional(),
       qty: Joi.number().required(),
     })
   ).min(1).required()

2. In the controller, in the stockCriteria for each item, add:
   if (item?.variantId) stockCriteria.variantId = item.variantId;
   else stockCriteria.variantId = { $exists: false };

Everything else stays the same.
Return the updated validation schema and the updated bulkStockAdjustment function.
```

---

### PROMPT 13 — stockHelper: checkStockQty variantId match

```
You are working on a Node.js / TypeScript ERP backend.
File: src/helper/stockHelper.ts   (paste full current content)

The function checkStockQty currently looks up stock using:
  { productId: item.productId, branchId, isDeleted: false }

Change the stock lookup to also include variantId when the item has one:
  const stockCriteria: any = { productId: item.productId, branchId, isDeleted: false };
  if (item.variantId) stockCriteria.variantId = item.variantId;
  else stockCriteria.variantId = { $exists: false };

  const stock = await getFirstMatch(stockModel, stockCriteria, {}, {});

Everything else (the error message, the return false logic) stays identical.
Return only the updated full file content.
```

---

### PROMPT 14 — POS Order Model: add variantId to posItemSchema

```
You are working on a Node.js / TypeScript ERP backend.
File: src/database/model/posOrder.ts   (paste full current content)

In posItemSchema, add one field after productId:
  variantId: { type: Schema.Types.ObjectId, ref: "product", default: null }
  // ref: "product" because variants live as sub-documents of product

Do NOT change any other field.
Return only the updated full file content.
```

---

### PROMPT 15 — POS Order Controller: wire variantId in stock operations

```
You are working on a Node.js / TypeScript ERP backend.
File: src/controllers/posOrder/index.ts

There are exactly 5 places where stock qty is incremented or decremented by productId.
Find all of them by searching for: stockModel.findOneAndUpdate

Each one looks like:
  stockModel.findOneAndUpdate(
    { productId: item.productId, branchId: ..., isDeleted: false },
    { $inc: { qty: ... } }
  )

For every single one, update the match criteria to also include variantId:
  const stockMatchCriteria: any = {
    productId: item.productId,
    branchId: <whatever branchId was before>,
    isDeleted: false,
  };
  if (item.variantId) stockMatchCriteria.variantId = item.variantId;
  else stockMatchCriteria.variantId = { $exists: false };

  await stockModel.findOneAndUpdate(stockMatchCriteria, { $inc: { qty: ... } });

Also in checkStockQty call sites (addPosOrder and editPosOrder), 
the items passed already have variantId from the validated payload — 
no change needed there since stockHelper will be updated separately (Prompt 13).

Make NO other changes to the file.
Return only the 5 updated stockModel.findOneAndUpdate call sites with enough surrounding 
context (the for-loop they're in) to identify where each one goes.
```

---

### PROMPT 16 — Routes

```
You are working on a Node.js / TypeScript ERP backend.
File: src/routes/product.ts   (paste full current content)

Add this route BEFORE the existing router.get("/:id", ...) line:
  router.get("/barcode/:code", productController.getByBarcode);

The placement before /:id is critical to avoid route shadowing.

Also make sure getByBarcode is exported from src/controllers/product/index.ts
(it will be after running Prompt 9).

Return only the updated full file content.
```

---

## 6. What Doesn't Need Changing (and Why)

| Module | Reason unchanged |
|---|---|
| `stock.ts` model | `variantId` field already exists — just needs to be queried |
| `validation/stock.ts` | `variantId: objectId().optional()` already in addStockSchema and editStockSchema |
| `purchaseOrder` items | Variant support in purchase/sales orders is a Phase 2 concern; the system works without it |
| `invoice` / `supplierBill` | Same — Phase 2 |
| `returnPosOrder` | Will naturally carry the variantId once posItemSchema has it |

---

## 7. Data Migration

No migration script is needed. Existing products will have no `variants` array and no `barcode` — MongoDB treats absent fields as empty/null. Existing stock records have `variantId: undefined` which matches the `{ $exists: false }` queries added in Prompts 10–15, so all existing stock lookups continue to work correctly.
